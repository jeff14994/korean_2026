/* ============================================================
   Korean 2026 — Main Application Script
   ============================================================ */

// === Configuration ===
const SCAN_TOTAL = 64;
const SCAN_FOLDER = 'CamScanner 5-15-26 21.57';
const SCAN_PREFIX = 'CamScanner 5-15-26 21.57_';
const THEME_KEY = 'korean-2026-theme';

// === Audio State ===
let currentAudio = null;
let koreanVoices = [];
let koreanVoice = null;
const audioCache = new Map();

const preferredVoicePatterns = [
    /yuna/i, /google.*korean/i, /korean.*premium/i, /sora/i, /ko[-_]kr/i
];

// === Page State ===
const pageScrollPositions = {};

// Build pageLabels dynamically: page1, page2, page3, page4, page5..page68
const pageLabels = {
    page1: 'Page 1：助詞整理',
    page2: 'Page 2：閱讀理解',
    page3: 'Page 3：閱讀+單字',
    page4: 'Page 4：單字+聽力'
};
const SCAN_PAGE_OFFSET = 4; // scan pages start at page5
for (let i = 1; i <= SCAN_TOTAL; i++) {
    pageLabels[`page${i + SCAN_PAGE_OFFSET}`] = `Page ${i + SCAN_PAGE_OFFSET}：掃描 ${i}`;
}

// ─────────────────────────────────────────────
// 1. Generate Scan Pages (page5 – page68)
// ─────────────────────────────────────────────
function generateScanPages() {
    const container = document.getElementById('scanPagesContainer');
    if (!container) return;

    for (let i = 1; i <= SCAN_TOTAL; i++) {
        const pageNum = i + SCAN_PAGE_OFFSET; // page5 = image 1, page68 = image 64
        const div = document.createElement('div');
        div.id = `page${pageNum}`;
        div.className = 'page-container';
        div.innerHTML = `
            <h2>📖 教材掃描 — 第 ${i} 頁</h2>
            <img class="scan-page-image" src="${SCAN_FOLDER}/${SCAN_PREFIX}${i}.jpg" alt="教材第 ${i} 頁" loading="lazy">
            <p class="scan-page-info">掃描頁 ${i} / ${SCAN_TOTAL}（系統頁碼 Page ${pageNum}）</p>
        `;
        container.appendChild(div);
    }

    // Populate sidebar scan dropdown
    const select = document.getElementById('sidebarScanSelect');
    if (select) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '— 選擇掃描頁 —';
        select.appendChild(placeholder);

        for (let i = 1; i <= SCAN_TOTAL; i++) {
            const pageNum = i + SCAN_PAGE_OFFSET;
            const opt = document.createElement('option');
            opt.value = `page${pageNum}`;
            opt.textContent = `掃描 ${i}（Page ${pageNum}）`;
            select.appendChild(opt);
        }

        select.addEventListener('change', () => {
            if (select.value) switchToPage(select.value);
        });
    }
}

// ─────────────────────────────────────────────
// 2. Theme
// ─────────────────────────────────────────────
function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    const label = isDark ? '☀️ 淺色模式' : '🌙 深色模式';

    const ids = ['themeToggle', 'floatingThemeToggle'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = label;
    });
}

function toggleTheme() {
    const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
}

function initializeTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) { applyTheme(saved); return; }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
}

// ─────────────────────────────────────────────
// 3. TTS / Audio
// ─────────────────────────────────────────────
function pickKoreanVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    koreanVoices = voices.filter(v => /ko[-_]KR|korean|한국/i.test(`${v.lang} ${v.name}`));
    koreanVoice = koreanVoices.find(v =>
        preferredVoicePatterns.some(p => p.test(`${v.lang} ${v.name}`))
    ) || koreanVoices[0] || null;
    populateVoiceOptions();
}

function populateVoiceOptions() {
    const sel = document.getElementById('voiceSelect');
    if (!sel) return;
    sel.innerHTML = '';

    if (!koreanVoices.length) {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '找不到可用韓語系統語音';
        sel.appendChild(o);
        return;
    }

    koreanVoices.forEach((v, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = `${v.name} (${v.lang})`;
        if (v === koreanVoice) o.selected = true;
        sel.appendChild(o);
    });
}

function stopAllPlayback() {
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function speakWithBrowser(text) {
    if (!('speechSynthesis' in window)) { alert('此瀏覽器不支援語音播放功能。'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = Number(document.getElementById('rateControl')?.value || 0.9);
    u.pitch = 1;
    if (koreanVoice) u.voice = koreanVoice;
    window.speechSynthesis.speak(u);
}

function buildTtsUrl(text) {
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(text)}`;
}

function getCachedAudio(text) {
    const key = buildTtsUrl(text);
    if (!audioCache.has(key)) {
        const a = new Audio(key);
        a.preload = 'auto';
        audioCache.set(key, a);
    }
    return audioCache.get(key);
}

function playKorean(text, button) {
    stopAllPlayback();
    const orig = button.textContent;
    button.disabled = true;
    button.textContent = '播放中...';

    const reset = () => { button.disabled = false; button.textContent = orig; };
    const mode = document.getElementById('ttsMode')?.value || 'remote';

    if (mode === 'browser') { speakWithBrowser(text); setTimeout(reset, 400); return; }

    const audio = getCachedAudio(text);
    currentAudio = audio;
    audio.currentTime = 0;
    audio.addEventListener('ended', reset, { once: true });
    audio.addEventListener('pause', reset, { once: true });
    audio.addEventListener('error', () => { reset(); speakWithBrowser(text); }, { once: true });
    audio.play().catch(() => { reset(); speakWithBrowser(text); });
}

// ─────────────────────────────────────────────
// 4. Page Navigation
// ─────────────────────────────────────────────
function getCurrentPageId() {
    const active = document.querySelector('.page-container.active');
    return active ? active.id : null;
}

function getAllPageIds() {
    return Array.from(document.querySelectorAll('.page-container')).map(el => el.id);
}

function switchToPage(targetPage) {
    if (!document.getElementById(targetPage)) return;

    // Save scroll
    const cur = getCurrentPageId();
    if (cur) pageScrollPositions[cur] = window.scrollY;

    // Switch active
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    document.getElementById(targetPage).classList.add('active');

    // Sidebar links
    document.querySelectorAll('.page-link').forEach(l => {
        l.classList.remove('active');
        l.removeAttribute('aria-current');
    });
    const sidebarLink = document.querySelector(`.page-link[data-page="${targetPage}"]`);
    if (sidebarLink) {
        sidebarLink.classList.add('active');
        sidebarLink.setAttribute('aria-current', 'page');
    }

    // Sidebar scan select sync
    const scanSelect = document.getElementById('sidebarScanSelect');
    if (scanSelect) {
        const pageNum = parseInt(targetPage.replace('page', ''));
        scanSelect.value = pageNum > SCAN_PAGE_OFFSET ? targetPage : '';
    }

    // Page note
    const note = document.getElementById('pageNote');
    if (note) note.innerHTML = `目前所在頁面：<b>${pageLabels[targetPage] || targetPage}</b>`;

    // Restore scroll
    const saved = pageScrollPositions[targetPage];
    if (saved !== undefined) {
        requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'instant' }));
    } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    updateFloatingNav();
    hidePageListPopup();
}

// ─────────────────────────────────────────────
// 5. Floating Navigation
// ─────────────────────────────────────────────
function updateFloatingNav() {
    const allPages = getAllPageIds();
    const idx = allPages.indexOf(getCurrentPageId());
    const indicator = document.getElementById('floatingPageIndicator');
    if (indicator) indicator.textContent = `${idx + 1} / ${allPages.length}`;
    const prev = document.getElementById('floatingPrev');
    const next = document.getElementById('floatingNext');
    if (prev) prev.disabled = idx <= 0;
    if (next) next.disabled = idx >= allPages.length - 1;
}

function showPageListPopup() {
    const popup = document.getElementById('pageListPopup');
    if (!popup) return;
    const allPages = getAllPageIds();
    const currentId = getCurrentPageId();
    popup.innerHTML = '';

    allPages.forEach((pageId, i) => {
        const btn = document.createElement('button');
        btn.className = 'popup-item' + (pageId === currentId ? ' current' : '');
        const label = pageLabels[pageId] || pageId;
        btn.innerHTML = `<span class="popup-num">${i + 1}</span> ${label}`;
        btn.addEventListener('click', () => switchToPage(pageId));
        popup.appendChild(btn);
    });
    popup.classList.remove('hidden');
}

function hidePageListPopup() {
    const popup = document.getElementById('pageListPopup');
    if (popup) popup.classList.add('hidden');
}

// ─────────────────────────────────────────────
// 6. Chinese Toggle
// ─────────────────────────────────────────────
function toggleChinese() {
    const isHidden = document.body.classList.toggle('hide-chinese');
    const label = isHidden ? '👀 顯示中文' : '🙈 隱藏中文';
    document.getElementById('chineseToggle').textContent = label;
    document.getElementById('floatingChineseToggle').textContent = label;
}

// ─────────────────────────────────────────────
// 7. Quiz Logic
// ─────────────────────────────────────────────
function initQuiz() {
    let score = 0;
    let answered = 0;
    const cards = document.querySelectorAll('#page2 .card[data-answer]');
    const total = cards.length;

    document.getElementById('quizTotal').textContent = total;

    cards.forEach(card => {
        const correct = card.dataset.answer;
        const options = card.querySelectorAll('.quiz-option');
        const result = card.querySelector('.quiz-result');

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                if (card.classList.contains('answered')) return;
                card.classList.add('answered');

                const chosen = opt.dataset.val;
                const isCorrect = chosen === correct;

                options.forEach(o => {
                    o.classList.add('selected');
                    if (o.dataset.val === correct) o.classList.add('correct');
                });

                if (!isCorrect) {
                    opt.classList.add('wrong');
                    result.classList.add('wrong-result');
                } else {
                    score++;
                    result.classList.add('correct-result');
                }

                answered++;
                result.classList.add('show');
                document.getElementById('quizScore').textContent = score;
                document.getElementById('quizAnswered').textContent = answered;
            });
        });
    });
}

function initQuizPage3() {
    let score = 0;
    let answered = 0;
    const cards = document.querySelectorAll('#page3 .card[data-answer]');
    const total = cards.length;

    const scoreEl = document.getElementById('quizScore3');
    const totalEl = document.getElementById('quizTotal3');
    const answeredEl = document.getElementById('quizAnswered3');
    if (totalEl) totalEl.textContent = total;

    cards.forEach(card => {
        const correct = card.dataset.answer;
        const options = card.querySelectorAll('.quiz-option');
        const result = card.querySelector('.quiz-result');

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                if (card.classList.contains('answered')) return;
                card.classList.add('answered');

                const chosen = opt.dataset.val;
                const isCorrect = chosen === correct;

                options.forEach(o => {
                    o.classList.add('selected');
                    if (o.dataset.val === correct) o.classList.add('correct');
                });

                if (!isCorrect) {
                    opt.classList.add('wrong');
                    result.classList.add('wrong-result');
                } else {
                    score++;
                    result.classList.add('correct-result');
                }

                answered++;
                result.classList.add('show');
                if (scoreEl) scoreEl.textContent = score;
                if (answeredEl) answeredEl.textContent = answered;
            });
        });
    });

    // Vocab preview buttons for page3 quiz
    document.querySelectorAll('#page3 .quiz-options').forEach(optionsDiv => {
        const preview = document.createElement('div');
        preview.className = 'vocab-preview';
        const label = document.createElement('span');
        label.textContent = '🔊 點擊聽發音：';
        label.style.fontSize = '0.85rem';
        label.style.color = 'var(--muted)';
        preview.appendChild(label);

        optionsDiv.querySelectorAll('.quiz-option').forEach(opt => {
            const korean = opt.textContent.replace(/（[^）]+）/g, '').trim();
            if (!korean) return;
            const btn = document.createElement('button');
            btn.className = 'vocab-preview-btn';
            btn.textContent = '🔈 ' + korean;
            btn.type = 'button';
            btn.addEventListener('click', e => { e.stopPropagation(); playKorean(korean, btn); });
            preview.appendChild(btn);
        });

        optionsDiv.after(preview);
    });
}

// ─────────────────────────────────────────────
// 8. Text Enhancements (wrap Chinese, vocab previews)
// ─────────────────────────────────────────────
function enhanceTextElements() {
    // Wrap Chinese in .chi spans for hiding (all pages)
    document.querySelectorAll('.quiz-option, .score-bar, .quiz-result').forEach(el => {
        el.innerHTML = el.innerHTML.replace(/（[^）]+）/g, '<span class="chi">$&</span>');
    });

    document.querySelectorAll('.word-meanings').forEach(el => {
        el.innerHTML = el.innerHTML.replace(/＝[^、<]+/g, '<span class="chi">$&</span>');
    });

    // Number Page 2 play buttons
    document.querySelectorAll('#page2 .card').forEach(card => {
        const title = card.querySelector('.card-title');
        const btn = card.querySelector('.play-btn');
        if (title && btn) {
            const num = title.textContent.replace(/（.*）/, '').trim().replace(/\.$/, '');
            btn.textContent = '▶ 播放句子 ' + num;
        }
    });

    // Vocab preview buttons for quiz
    document.querySelectorAll('#page2 .quiz-options').forEach(optionsDiv => {
        const preview = document.createElement('div');
        preview.className = 'vocab-preview';
        const label = document.createElement('span');
        label.textContent = '🔊 點擊聽發音：';
        label.style.fontSize = '0.85rem';
        label.style.color = 'var(--muted)';
        preview.appendChild(label);

        optionsDiv.querySelectorAll('.quiz-option').forEach(opt => {
            const korean = opt.textContent.replace(/（[^）]+）/g, '').trim();
            if (!korean) return;
            const btn = document.createElement('button');
            btn.className = 'vocab-preview-btn';
            btn.textContent = '🔈 ' + korean;
            btn.type = 'button';
            btn.addEventListener('click', e => { e.stopPropagation(); playKorean(korean, btn); });
            preview.appendChild(btn);
        });

        optionsDiv.after(preview);
    });
}

// ─────────────────────────────────────────────
// 9. Initialize Everything
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Generate scan pages first (before querying allPages)
    generateScanPages();

    // Theme
    initializeTheme();

    // TTS voices
    if ('speechSynthesis' in window) {
        pickKoreanVoice();
        window.speechSynthesis.onvoiceschanged = pickKoreanVoice;
    }

    // Voice select
    document.getElementById('voiceSelect')?.addEventListener('change', e => {
        koreanVoice = koreanVoices[Number(e.target.value)] || koreanVoice;
    });

    // Rate control
    document.getElementById('rateControl')?.addEventListener('input', e => {
        document.getElementById('rateValue').value = `${Number(e.target.value).toFixed(2)}x`;
    });

    // Theme toggles
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('floatingThemeToggle')?.addEventListener('click', toggleTheme);

    // Chinese toggles
    document.getElementById('chineseToggle')?.addEventListener('click', toggleChinese);
    document.getElementById('floatingChineseToggle')?.addEventListener('click', toggleChinese);

    // Play buttons
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => playKorean(btn.dataset.text, btn));
    });

    // Word click to play (event delegation)
    document.addEventListener('click', e => {
        const word = e.target.closest('.word-meanings b');
        if (!word) return;
        e.preventDefault();
        e.stopPropagation();
        const text = word.textContent.trim();
        if (!text) return;
        const tmp = document.createElement('button');
        tmp.textContent = text;
        playKorean(text, tmp);
    });

    // Panel tabs (scoped per page container)
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.panel;
            const pageContainer = tab.closest('.page-container');
            if (pageContainer) {
                pageContainer.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
                pageContainer.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
            }
            tab.classList.add('active');
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    // Sidebar page links
    document.querySelectorAll('.page-link[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchToPage(link.dataset.page);
        });
    });

    // Floating prev/next
    document.getElementById('floatingPrev')?.addEventListener('click', () => {
        const allPages = getAllPageIds();
        const idx = allPages.indexOf(getCurrentPageId());
        if (idx > 0) switchToPage(allPages[idx - 1]);
    });

    document.getElementById('floatingNext')?.addEventListener('click', () => {
        const allPages = getAllPageIds();
        const idx = allPages.indexOf(getCurrentPageId());
        if (idx < allPages.length - 1) switchToPage(allPages[idx + 1]);
    });

    // Long-press on indicator for page list popup
    const indicator = document.getElementById('floatingPageIndicator');
    const popup = document.getElementById('pageListPopup');
    let longPressTimer = null;

    indicator?.addEventListener('mousedown', e => {
        e.preventDefault();
        longPressTimer = setTimeout(showPageListPopup, 400);
    });
    indicator?.addEventListener('mouseup', () => clearTimeout(longPressTimer));
    indicator?.addEventListener('mouseleave', () => clearTimeout(longPressTimer));

    indicator?.addEventListener('touchstart', e => {
        longPressTimer = setTimeout(() => { e.preventDefault(); showPageListPopup(); }, 400);
    }, { passive: false });
    indicator?.addEventListener('touchend', () => clearTimeout(longPressTimer));
    indicator?.addEventListener('touchcancel', () => clearTimeout(longPressTimer));

    document.addEventListener('click', e => {
        if (popup && !popup.contains(e.target) && e.target !== indicator) hidePageListPopup();
    });

    // Keyboard navigation for scan pages
    document.addEventListener('keydown', e => {
        const allPages = getAllPageIds();
        const idx = allPages.indexOf(getCurrentPageId());
        if (e.key === 'ArrowLeft' && idx > 0) switchToPage(allPages[idx - 1]);
        if (e.key === 'ArrowRight' && idx < allPages.length - 1) switchToPage(allPages[idx + 1]);
    });

    // Text enhancements & quiz
    enhanceTextElements();
    initQuiz();
    initQuizPage3();

    // Initial floating nav state
    updateFloatingNav();
});
