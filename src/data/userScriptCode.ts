export const EXACT_USERSCRIPT_CODE = `// ==UserScript==
// @name        gemini1 - Piper Lektor
// @namespace   http://tampermonkey.net/
// @version     2.5.1
// @description Czyta napisy z Immersive Translate oraz wbudowane (Netflix, YT, Prime, Disney+). Wycina nawiasy, cenzuruje, posiada regulację prędkości, ducking, koordynację wielu kart (Audio Focus), eliminację podwójnego czytania zdań oraz automatyczne wykrywanie polskiego dubbingu na YouTube.
// @author      Fix / Asystent
// @match       *://*/*
// @grant       GM_xmlhttpRequest
// @connect     127.0.0.1
// @connect     localhost
// @run-at      document-idle
// ==/UserScript==

(function () {
    'use strict';

    if (window.__PIPER_8765_IMMERSIVE_RUNNING__) return;
    window.__PIPER_8765_IMMERSIVE_RUNNING__ = true;

    const TTS_URL = 'http://127.0.0.1:8765/tts';
    const HEALTH_URL = 'http://127.0.0.1:8765/health';

    const AVAILABLE_VOICES = [
        { id: 'jarvis', name: 'Jarvis' },
        { id: 'gosia', name: 'Gosia' },
        { id: 'bass', name: 'Bass' },
        { id: 'justyna', name: 'Justyna' },
        { id: 'meski', name: 'Męski WG' },
        { id: 'zenski', name: 'Żeński WG' }
    ];

    // --- ID KARTY I KOORDYNACJA WIELU KART (AUDIO FOCUS) ---
    const TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    let hasAudioFocus = true;

    // --- ŁADOWANIE USTAWIEŃ ---
    let isEnabled = localStorage.getItem('piper8765_Enabled') === 'true';
    let selectedVoice = localStorage.getItem('piper8765_Voice') || 'jarvis';
    let duckVolumePct = parseInt(localStorage.getItem('piper8765_DuckPct') || '15', 10);
    let ttsBoost = parseFloat(localStorage.getItem('piper8765_TTSBoost') || '1.0');
    let speechRate = parseFloat(localStorage.getItem('piper8765_SpeechRate') || '1.0');
    
    // Koordynacja kart & Wykrywanie polskiego dubbingu YT
    let singleTabMode = localStorage.getItem('piper8765_SingleTabMode') !== 'false'; // Domyślnie włączone
    let autoMuteHiddenTab = localStorage.getItem('piper8765_AutoMuteHidden') !== 'false'; // Domyślnie włączone
    let detectYTPolishAudio = localStorage.getItem('piper8765_DetectYTPolish') !== 'false'; // Domyślnie włączone

    // Ustawienia filtrowania tekstu
    let filterBrackets = localStorage.getItem('piper8765_FilterBrackets') !== 'false';
    let filterArtifacts = localStorage.getItem('piper8765_FilterArtifacts') !== 'false';
    let filterEnabled = localStorage.getItem('piper8765_FilterEnabled') !== 'false';
    let filterMode = localStorage.getItem('piper8765_FilterMode') || 'remove';
    let customProfanity = [];
    try { customProfanity = JSON.parse(localStorage.getItem('piper8765_CustomProfanity') || '[]'); } catch (e) { customProfanity = []; }

    // --- ZMIENNE STANOWE ---
    let audioCtx = null;
    let imtLastSubtitle = '';
    const imtQueue = [];
    let imtSpeaking = false;
    let imtGenerating = false;
    let imtCurrentAudio = null;
    let imtCurrentSource = null;
    let imtCurrentGain = null;
    let imtCurrentUrl = null;
    let originalVolumes = new WeakMap();

    function saveSettings() {
        localStorage.setItem('piper8765_Enabled', isEnabled);
        localStorage.setItem('piper8765_Voice', selectedVoice);
        localStorage.setItem('piper8765_DuckPct', duckVolumePct);
        localStorage.setItem('piper8765_TTSBoost', ttsBoost);
        localStorage.setItem('piper8765_SpeechRate', speechRate);
        localStorage.setItem('piper8765_SingleTabMode', singleTabMode);
        localStorage.setItem('piper8765_AutoMuteHidden', autoMuteHiddenTab);
        localStorage.setItem('piper8765_DetectYTPolish', detectYTPolishAudio);
        localStorage.setItem('piper8765_FilterBrackets', filterBrackets);
        localStorage.setItem('piper8765_FilterArtifacts', filterArtifacts);
        localStorage.setItem('piper8765_FilterEnabled', filterEnabled);
        localStorage.setItem('piper8765_FilterMode', filterMode);
    }

    // --- WYKRYWANIE POLSKIEJ ŚCIEŻKI DŹWIĘKOWEJ / DUBBINGU NA YOUTUBE ---
    function checkYouTubeHasPolishAudio() {
        if (!detectYTPolishAudio || !window.location.hostname.includes('youtube.com')) {
            return false;
        }

        try {
            const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (player) {
                // 1. Sprawdzenie aktywnej ścieżki dźwiękowej w odtwarzaczu YouTube
                if (typeof player.getAudioTrack === 'function') {
                    const track = player.getAudioTrack();
                    if (track) {
                        const trackName = (track.displayName || track.name || track.id || '').toLowerCase();
                        if (trackName.includes('polski') || trackName.includes('polish') || trackName.startsWith('pl')) {
                            return true;
                        }
                    }
                }

                // 2. Sprawdzenie listy dostępnych ścieżek dźwiękowych YouTube
                if (typeof player.getAvailableAudioTracks === 'function') {
                    const tracks = player.getAvailableAudioTracks();
                    if (Array.isArray(tracks) && tracks.length > 0) {
                        const active = tracks.find(t => t.isActive || t.isDefault);
                        if (active) {
                            const trackName = (active.displayName || active.name || active.id || '').toLowerCase();
                            if (trackName.includes('polski') || trackName.includes('polish') || trackName.startsWith('pl')) {
                                return true;
                            }
                        }
                    }
                }
            }

            // 3. Sprawdzenie menu ustawień odtwarzacza YouTube (jeśli otwarte)
            const menuItems = document.querySelectorAll('.ytp-menuitem-content, .ytp-menuitem-label');
            for (const item of menuItems) {
                const txt = (item.textContent || '').toLowerCase();
                if (txt.includes('polski (oryginalny)') || txt.includes('polski (dubbing)') || txt.includes('polski (audio)')) {
                    return true;
                }
            }
        } catch (e) {}

        return false;
    }

    // --- KANAŁ SYNCHRONIZACJI MIĘDZY KARTAMI (BROADCASTCHANNEL + STORAGE) ---
    let syncChannel = null;
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            syncChannel = new BroadcastChannel('piper_lektor_audio_sync');
            syncChannel.onmessage = (event) => {
                handleCrossTabMessage(event.data);
            };
        }
    } catch (e) {}

    window.addEventListener('storage', (e) => {
        if (e.key === 'piper8765_CrossTabEvent' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                handleCrossTabMessage(data);
            } catch (err) {}
        }
    });

    function broadcastCrossTab(msg) {
        if (!singleTabMode) return;
        const payload = {
            ...msg,
            senderTabId: TAB_ID,
            timestamp: Date.now(),
            domain: window.location.hostname || 'Karta przeglądarki'
        };
        if (syncChannel) {
            try { syncChannel.postMessage(payload); } catch (e) {}
        }
        try {
            localStorage.setItem('piper8765_CrossTabEvent', JSON.stringify(payload));
        } catch (e) {}
    }

    function handleCrossTabMessage(data) {
        if (!singleTabMode || !data || data.senderTabId === TAB_ID) return;

        if (data.type === 'CLAIM_AUDIO_FOCUS' || data.type === 'START_SPEECH') {
            hasAudioFocus = false;
            stopAudio();
            imtSpeaking = false;
            imtQueue.length = 0;
            restoreVideos();
            updateStatusLabel('⏸️ Wyciszono (inna karta przejęła lektora: ' + (data.domain || 'inna karta') + ')');
        }
    }

    function claimAudioFocus() {
        hasAudioFocus = true;
        broadcastCrossTab({ type: 'CLAIM_AUDIO_FOCUS' });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (singleTabMode && isEnabled) {
                claimAudioFocus();
                updateStatusLabel(imtSpeaking ? '(Czyta w tej karcie)' : '🟢 Aktywna karta (Lektor gotowy)');
            }
        } else if (document.visibilityState === 'hidden') {
            if (singleTabMode && autoMuteHiddenTab) {
                stopAudio();
                imtSpeaking = false;
                restoreVideos();
            }
        }
    });

    window.addEventListener('focus', () => {
        if (singleTabMode && isEnabled) {
            claimAudioFocus();
        }
    });

    // --- WYSZUKIWANIE WIDEO ---
    function findAllVideos(root = document, results = []) {
        try {
            const media = root.querySelectorAll('video, audio:not(.piper-audio)');
            media.forEach(m => results.push(m));
        } catch(e) {}
        const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
        for (const el of allElements) {
            if (el.shadowRoot) findAllVideos(el.shadowRoot, results);
        }
        return results;
    }

    // --- DUCKING (WYCISZANIE TŁA) ---
    function duckVideos() {
        const videos = findAllVideos();
        const targetVol = duckVolumePct / 100;
        videos.forEach(media => {
            if (!originalVolumes.has(media)) originalVolumes.set(media, media.volume);
            media.volume = targetVol;
        });
    }

    function restoreVideos() {
        const videos = findAllVideos();
        videos.forEach(media => {
            if (originalVolumes.has(media)) {
                media.volume = originalVolumes.get(media);
                originalVolumes.delete(media);
            } else {
                media.volume = 1.0;
            }
        });
    }

    function ensureAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    // --- CZARNA LISTA KOMUNIKATÓW SYSTEMOWYCH / IMMERSIVE TRANSLATE UI ---
    const SYSTEM_UI_PATTERNS = [
        /enable\s+subtitles\s+translation/gi,
        /translation\s+subtitles/gi,
        /subtitles\s+translation/gi,
        /click\s+to\s+translate/gi,
        /immersive\s+translate/gi,
        /włącz\s+tłumaczenie\s+napisów/gi,
        /tłumaczenie\s+napisów/gi,
        /\btranslat(?:ing|ed|e)\b/gi,
        /auto-generated/gi,
        /wygenerowane\s+automatycznie/gi
    ];

    function isSystemPrompt(text) {
        if (!text) return true;
        const clean = text.trim().toLowerCase();
        if (clean.length < 2) return true;
        if (/^(?:enable\s+subtitles|translation\s+subtitles|subtitles\s+translation|immersive\s+translate|translating|subtitles|tłumaczenie\s+napisów)$/i.test(clean)) {
            return true;
        }
        return false;
    }

    // --- ANTY-DUPLIKACJA I PAMIĘĆ ZDAŃ (Eliminacja podwójnego czytania) ---
    const recentSpokenHistory = new Map(); // normalizedText -> timestamp

    function normalizeForComparison(str) {
        return (str || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function hasBeenRecentlySpoken(text) {
        const norm = normalizeForComparison(text);
        if (!norm || norm.length < 2) return true;
        const now = Date.now();

        // Przeczyść stare wpisy (> 30s)
        for (const [key, time] of recentSpokenHistory.entries()) {
            if (now - time > 30000) recentSpokenHistory.delete(key);
        }

        // 1. Dokładne lub znormalizowane dopasowanie
        if (recentSpokenHistory.has(norm)) return true;

        // 2. Czy jest już w kolejce oczekujących lub aktualnie odtwarzanych?
        for (const item of imtQueue) {
            if (normalizeForComparison(item.text) === norm) return true;
        }

        // 3. Sprawdź czy któreś z ostatnich zdań już zawiera ten tekst
        for (const [key] of recentSpokenHistory.entries()) {
            if (key.length >= norm.length && key.includes(norm)) return true;
        }

        return false;
    }

    function markAsSpoken(text) {
        const norm = normalizeForComparison(text);
        if (norm) recentSpokenHistory.set(norm, Date.now());
    }

    // --- WYSZUKIWANIE NAPISÓW (SELEKTYWNE SEGMENTY) ---
    function collectCurrentSubtitleSegments(root = document, results = []) {
        if (!root || !root.querySelectorAll) return results;

        try {
            // 1. Immersive Translate: Priorytet dla elementów przetłumaczonych (.imt-target, .imt-translation)
            const imtTargetNodes = root.querySelectorAll(
                '.imt-target, .imt-translation, .immersive-translate-target-translation, [data-immersive-translate-translation-element-mark]'
            );

            if (imtTargetNodes.length > 0) {
                imtTargetNodes.forEach(node => {
                    if (node.closest && (node.closest('.imt-btn') || node.closest('.imt-prompt') || node.closest('.imt-panel'))) return;
                    const text = (node.innerText || node.textContent || '').trim();
                    if (text) {
                        text.split(/\r?\n/).forEach(line => {
                            const trimmed = line.trim();
                            if (trimmed.length >= 2 && !isSystemPrompt(trimmed)) results.push(trimmed);
                        });
                    }
                });
            } else {
                // Fallback dla ogólnych napisów Immersive Translate
                const imtFallbackNodes = root.querySelectorAll('.imt-captions-text, .imt-cue:not(.imt-source):not(.imt-original)');
                imtFallbackNodes.forEach(node => {
                    if (node.closest && (node.closest('.imt-btn') || node.closest('.imt-prompt') || node.closest('.imt-panel'))) return;
                    const text = (node.innerText || node.textContent || '').trim();
                    if (text) {
                        text.split(/\r?\n/).forEach(line => {
                            const trimmed = line.trim();
                            if (trimmed.length >= 2 && !isSystemPrompt(trimmed)) results.push(trimmed);
                        });
                    }
                });
            }

            // 2. YouTube native captions (.ytp-caption-segment)
            const ytSegments = root.querySelectorAll('.ytp-caption-segment');
            ytSegments.forEach(node => {
                const text = (node.innerText || node.textContent || '').trim();
                if (text && text.length >= 2 && !isSystemPrompt(text)) {
                    results.push(text);
                }
            });

            // 3. Netflix
            const nflxNodes = root.querySelectorAll('.player-timedtext-text-container');
            nflxNodes.forEach(node => {
                const text = (node.innerText || node.textContent || '').trim();
                if (text) {
                    text.split(/\r?\n/).forEach(line => {
                        const trimmed = line.trim();
                        if (trimmed.length >= 2 && !isSystemPrompt(trimmed)) results.push(trimmed);
                    });
                }
            });

            // 4. Amazon Prime Video
            const primeNodes = root.querySelectorAll('.atvwebplayersdk-captions-text');
            primeNodes.forEach(node => {
                const text = (node.innerText || node.textContent || '').trim();
                if (text && text.length >= 2 && !isSystemPrompt(text)) results.push(text);
            });

            // 5. Inne serwisy (Disney+, Max, CDA, Player)
            const genericNodes = root.querySelectorAll('.dss-subtitle-text, .shaka-text-wrapper, .vjs-text-track-display, .jw-text-track-container');
            genericNodes.forEach(node => {
                const text = (node.innerText || node.textContent || '').trim();
                if (text && text.length >= 2 && !isSystemPrompt(text)) results.push(text);
            });
        } catch (e) {}

        const allElements = root.querySelectorAll('*');
        for (const el of allElements) {
            if (el.shadowRoot) collectCurrentSubtitleSegments(el.shadowRoot, results);
        }

        return results;
    }

    // --- CZYSZCZENIE I SANITYZACJA TEKSTU ---
    function sanitizeText(text) {
        if (!text) return '';
        let result = text;

        // Filtruj komunikaty systemowe UI
        for (const pattern of SYSTEM_UI_PATTERNS) {
            result = result.replace(pattern, '');
        }

        if (filterBrackets) {
            result = result.replace(/[\\(\\[\\{\\（\\【][^\\)\\}\\]\\）\\】]*[\\)\\}\\]\\）\\】]/gi, '');
        }

        if (filterArtifacts) {
            result = result.replace(/\\b(\\w+)(?:[\\s,.-]+\\1)+\\b/gi, '$1');
        }

        return result.replace(/\\s+/g, ' ').trim();
    }

    // --- CENZURA PRZEKLEŃSTW ---
    const PROFANITY_LIST = [
        'kurwa', 'kurwo', 'kurwy', 'kurwą', 'kurwę', 'kurw',
        'chuj', 'chuja', 'chuju', 'chujowy', 'chujowa', 'chujowe', 'chuje',
        'pierdol', 'pierdoli', 'pierdole', 'pierdolenie', 'pierdolony',
        'jebać', 'jebany', 'jebana', 'jebane', 'jebią', 'jeb',
        'dupa', 'dupy', 'dupę', 'dupą', 'dupie',
        'gówno', 'gówna', 'gównem', 'gówniany', 'gowno',
        'szmata', 'szmaty', 'szmac',
        'cipa', 'cipy', 'cipę', 'cipą',
        'cholera', 'cholery', 'cholerę', 'cholerny',
        'pieprzyć', 'pieprz'
    ];

    function censorText(text) {
        let cleaned = sanitizeText(text);
        if (!filterEnabled || !cleaned) return cleaned;
        
        const fullList = PROFANITY_LIST.concat(customProfanity);
        if (!fullList.length) return cleaned;
        
        let result = cleaned;
        const pattern = new RegExp('(' + fullList.map(word => word.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')).join('|') + ')', 'gi');
        switch(filterMode) {
            case 'remove': result = result.replace(pattern, ''); break;
            case 'beep': result = result.replace(pattern, '[BEEP]'); break;
            case 'replace':
            default:
                result = result.replace(pattern, (match) => match[0] + '*'.repeat(match.length - 1));
                break;
        }
        return result.replace(/\\s+/g, ' ').trim();
    }

    // --- ZAPYTANIA DO PIPERA (Działa w Tampermonkey GM_xmlhttpRequest oraz natywnym fetch dla Bookmarklet) ---
    function sendHttp(options) {
        if (typeof GM_xmlhttpRequest !== 'undefined') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    ...options,
                    onload: resolve,
                    onerror: reject,
                    ontimeout: reject
                });
            });
        } else {
            return fetch(options.url, {
                method: options.method,
                headers: options.headers,
                body: options.data
            }).then(async (res) => {
                if (options.responseType === 'blob') {
                    const blob = await res.blob();
                    return { status: res.status, response: blob };
                } else {
                    const text = await res.text();
                    return { status: res.status, responseText: text };
                }
            });
        }
    }

    function healthCheck() {
        return sendHttp({
            method: 'GET',
            url: HEALTH_URL,
            timeout: 3000
        }).then(res => {
            if (res.status >= 200 && res.status < 300) return true;
            throw new Error('Offline');
        });
    }

    function requestPiper(text) {
        return sendHttp({
            method: 'POST',
            url: TTS_URL,
            headers: { 'Content-Type': 'application/json', 'Accept': 'audio/wav' },
            data: JSON.stringify({ text, voice: selectedVoice, speed: speechRate }),
            responseType: 'blob',
            timeout: 30000
        }).then(res => {
            if (res.status >= 200 && res.status < 300 && res.response && res.response.size > 100) {
                return res.response;
            }
            throw new Error('HTTP ' + res.status);
        });
    }

    // --- LOGIKA ODTWARZANIA ---
    async function generateAudioLoop() {
        if (!isEnabled || imtGenerating) return;
        imtGenerating = true;
        try {
            while (isEnabled) {
                const item = imtQueue.find(x => !x.failed && !x.ready && !x.audio);
                if (!item) break;
                try {
                    const finalText = censorText(item.text);
                    if (!finalText || finalText.length < 2) {
                        item.failed = true;
                    } else {
                        item.audio = await requestPiper(finalText);
                        item.ready = true;
                    }
                } catch (e) {
                    item.failed = true;
                } finally {
                    playNext();
                }
            }
        } finally {
            imtGenerating = false;
        }
    }

    function playNext() {
        if (!isEnabled || imtSpeaking) return;

        // Jeśli na YouTube wykryto polski dubbing -> wyciszamy lektora AI
        if (checkYouTubeHasPolishAudio()) {
            stopAudio();
            imtQueue.length = 0;
            restoreVideos();
            updateStatusLabel('🇵🇱 Wykryto polski dubbing na YouTube (Lektor wyłączony)');
            return;
        }

        if (singleTabMode && !hasAudioFocus && document.visibilityState === 'hidden') {
            return;
        }

        while (imtQueue.length && imtQueue[0].failed) imtQueue.shift();
        
        if (!imtQueue.length) { 
            restoreVideos(); 
            return; 
        }

        const item = imtQueue[0];
        if (!item.ready || !item.audio) return;

        if (singleTabMode) {
            claimAudioFocus();
            broadcastCrossTab({ type: 'START_SPEECH', text: item.text });
        }

        imtSpeaking = true;
        ensureAudioCtx();
        duckVideos();

        imtCurrentUrl = URL.createObjectURL(item.audio);
        imtCurrentAudio = new Audio(imtCurrentUrl);
        imtCurrentAudio.classList.add('piper-audio');
        
        imtCurrentSource = audioCtx.createMediaElementSource(imtCurrentAudio);
        imtCurrentGain = audioCtx.createGain();
        imtCurrentGain.gain.value = ttsBoost; 
        imtCurrentSource.connect(imtCurrentGain);
        imtCurrentGain.connect(audioCtx.destination);

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            try { imtCurrentAudio.pause(); } catch (e) {}
            if (imtCurrentUrl) { try { URL.revokeObjectURL(imtCurrentUrl); } catch (e) {} }
            if (imtCurrentSource) { try { imtCurrentSource.disconnect(); } catch (e) {} }
            if (imtCurrentGain) { try { imtCurrentGain.disconnect(); } catch (e) {} }
            
            imtCurrentAudio = null;
            imtCurrentUrl = null;
            imtCurrentSource = null;
            imtCurrentGain = null;
            
            if (imtQueue[0] === item) imtQueue.shift();
            imtSpeaking = false;
            
            if (!imtQueue.length || !imtQueue[0].ready) {
                restoreVideos();
            }
            
            playNext();
            generateAudioLoop();
        };

        imtCurrentAudio.onended = finish;
        imtCurrentAudio.onerror = finish;
        imtCurrentAudio.play().catch(() => finish());
        updateStatusLabel('(Czyta): ' + item.text);
    }

    function stopAudio() {
        try {
            if (imtCurrentAudio) { 
                imtCurrentAudio.onended = null; 
                imtCurrentAudio.onerror = null; 
                imtCurrentAudio.pause(); 
            }
        } catch (e) {}
        if (imtCurrentSource) { try { imtCurrentSource.disconnect(); } catch (e) {} }
        if (imtCurrentGain) { try { imtCurrentGain.disconnect(); } catch (e) {} }
        if (imtCurrentUrl) { try { URL.revokeObjectURL(imtCurrentUrl); } catch (e) {} }
        imtCurrentAudio = null;
        imtCurrentUrl = null;
        imtCurrentSource = null;
        imtCurrentGain = null;
    }

    // --- PĘTLA GŁÓWNA ---
    function monitorSubtitles() {
        if (!isEnabled) return; 

        // 1. Sprawdź czy YouTube ma polski dubbing/audio
        if (checkYouTubeHasPolishAudio()) {
            if (imtSpeaking) stopAudio();
            updateStatusLabel('🇵🇱 Wykryto polski dubbing na YouTube (Lektor wyłączony)');
            return;
        }
        
        if (singleTabMode && !hasAudioFocus && document.visibilityState === 'hidden') {
            return;
        }

        const segments = collectCurrentSubtitleSegments();
        let hasNew = false;

        for (const rawText of segments) {
            const cleaned = censorText(rawText);
            if (!cleaned || cleaned.length < 2 || isSystemPrompt(cleaned)) continue;
            if (hasBeenRecentlySpoken(cleaned)) continue;

            markAsSpoken(cleaned);
            imtQueue.push({ text: cleaned, audio: null, ready: false, failed: false });
            hasNew = true;
        }

        if (hasNew) {
            generateAudioLoop();
            playNext();
        }
    }
    
    setInterval(monitorSubtitles, 250);

    // --- GUI ---
    function updateStatusLabel(text) {
        const el = document.getElementById('piper-8765-status');
        if (el) el.textContent = text || '';
    }

    function toggleMasterSwitch() {
        isEnabled = !isEnabled;
        saveSettings();
        
        const btn = document.getElementById('piper-toggle-master');
        const rootBtn = document.getElementById('piper-float-btn');
        
        if (isEnabled) {
            btn.textContent = '🟩 Lektor: WŁĄCZONY';
            btn.style.background = '#155115';
            rootBtn.style.color = '#0f0';
            claimAudioFocus();
            healthCheck().catch(() => alert('Błąd: Serwer Piper nie odpowiada! Upewnij się, że serwer działa na porcie 8765.'));
        } else {
            btn.textContent = '🟥 Lektor: WYŁĄCZONY';
            btn.style.background = '#511515';
            rootBtn.style.color = '#fff';
            
            stopAudio();
            imtQueue.length = 0;
            imtSpeaking = false;
            imtLastSubtitle = '';
            restoreVideos();
            updateStatusLabel('');
        }
    }

    function renderFilterPanel() {
        let panel = document.getElementById('piper-8765-filter-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'piper-8765-filter-panel';
            panel.style.cssText = 'position:fixed;right:250px;bottom:20px;z-index:2147483648;width:240px;background:rgba(14,14,18,.98);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px;display:none;flex-direction:column;gap:6px;box-shadow:0 16px 36px rgba(0,0,0,0.85);backdrop-filter:blur(16px);';
            document.body.appendChild(panel);
        }

        panel.innerHTML = \`
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:5px;">
                <strong style="color:#c7d2fe;font:11px system-ui,sans-serif;font-weight:600;">Zaawansowane & Karty</strong>
                <button id="piper-filter-close" style="background:transparent;color:#f87171;border:none;cursor:pointer;font-weight:bold;font-size:12px;">✕</button>
            </div>

            <label style="display:flex;align-items:center;gap:6px;color:#a5b4fc;font:10px system-ui,sans-serif;font-weight:600;cursor:pointer;">
                <input type="checkbox" id="piper-single-tab-mode" \${singleTabMode ? 'checked' : ''}/> Tylko 1 karta naraz (Audio Focus)
            </label>

            <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font:10px system-ui,sans-serif;cursor:pointer;">
                <input type="checkbox" id="piper-auto-mute-hidden" \${autoMuteHiddenTab ? 'checked' : ''}/> Wyciszaj kartę w tle
            </label>

            <label style="display:flex;align-items:center;gap:6px;color:#38bdf8;font:10px system-ui,sans-serif;font-weight:600;cursor:pointer;">
                <input type="checkbox" id="piper-yt-polish-detect" \${detectYTPolishAudio ? 'checked' : ''}/> Auto-wykrywanie polskiego dubbingu YT
            </label>

            <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;"></div>
            
            <label style="display:flex;align-items:center;gap:6px;color:#ccc;font:10px system-ui,sans-serif;cursor:pointer;">
                <input type="checkbox" id="piper-filter-brackets" \${filterBrackets ? 'checked' : ''}/> Ignoruj nawiasy ( ), [ ], { }
            </label>

            <label style="display:flex;align-items:center;gap:6px;color:#ccc;font:10px system-ui,sans-serif;cursor:pointer;">
                <input type="checkbox" id="piper-filter-artifacts" \${filterArtifacts ? 'checked' : ''}/> Usuń powtórzenia i "translating"
            </label>

            <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;">
                <label style="display:flex;align-items:center;gap:6px;color:#ccc;font:10px system-ui,sans-serif;cursor:pointer;">
                    <input type="checkbox" id="piper-filter-enabled" \${filterEnabled ? 'checked' : ''}/> Cenzura przekleństw
                </label>
            </div>

            <select id="piper-filter-mode" style="width:100%;height:24px;background:#09090b;color:#fff;border:1px solid rgba(255,255,255,0.15);font:10px system-ui,sans-serif;border-radius:6px;padding:0 4px;">
                <option value="remove" \${filterMode === 'remove' ? 'selected' : ''}>Usuń słowo ("")</option>
                <option value="beep" \${filterMode === 'beep' ? 'selected' : ''}>Zastąp [BEEP]</option>
                <option value="replace" \${filterMode === 'replace' ? 'selected' : ''}>Zamaskuj Za*****j</option>
            </select>
            
            <div style="color:#888;font:9px system-ui,sans-serif;border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;">Własne cenzurowane słowa:</div>
            <div style="display:flex;gap:4px;">
                <input id="piper-filter-word-input" type="text" style="flex:1;height:22px;background:#09090b;color:#fff;border:1px solid rgba(255,255,255,0.15);font:10px system-ui,sans-serif;padding:0 6px;border-radius:6px;"/>
                <button id="piper-filter-word-add" style="width:26px;height:22px;background:#4f46e5;color:#fff;border:none;cursor:pointer;font-weight:bold;border-radius:6px;">+</button>
            </div>
            <div id="piper-filter-word-list" style="display:flex;flex-direction:column;gap:3px;max-height:80px;overflow-y:auto;"></div>
        \`;

        panel.querySelector('#piper-filter-close').addEventListener('click', () => panel.style.display = 'none');
        
        panel.querySelector('#piper-single-tab-mode').addEventListener('change', (e) => {
            singleTabMode = e.target.checked;
            saveSettings();
        });

        panel.querySelector('#piper-auto-mute-hidden').addEventListener('change', (e) => {
            autoMuteHiddenTab = e.target.checked;
            saveSettings();
        });

        panel.querySelector('#piper-yt-polish-detect').addEventListener('change', (e) => {
            detectYTPolishAudio = e.target.checked;
            saveSettings();
        });

        panel.querySelector('#piper-filter-brackets').addEventListener('change', (e) => {
            filterBrackets = e.target.checked;
            saveSettings();
        });

        panel.querySelector('#piper-filter-artifacts').addEventListener('change', (e) => {
            filterArtifacts = e.target.checked;
            saveSettings();
        });

        panel.querySelector('#piper-filter-enabled').addEventListener('change', (e) => {
            filterEnabled = e.target.checked;
            saveSettings();
        });
        
        panel.querySelector('#piper-filter-mode').addEventListener('change', (e) => {
            filterMode = e.target.value;
            saveSettings();
        });

        const wordInput = panel.querySelector('#piper-filter-word-input');
        const addWord = () => {
            const w = (wordInput.value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
            if (w && !customProfanity.includes(w)) {
                customProfanity.push(w);
                localStorage.setItem('piper8765_CustomProfanity', JSON.stringify(customProfanity));
                renderFilterPanel(); 
            }
            wordInput.value = '';
        };
        panel.querySelector('#piper-filter-word-add').addEventListener('click', addWord);

        const listEl = panel.querySelector('#piper-filter-word-list');
        customProfanity.forEach((w, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#18181b;padding:3px 6px;border:1px solid rgba(255,255,255,0.08);border-radius:4px;';
            row.innerHTML = \`<span style="color:#fda4af;font:10px monospace;">\${w}</span>
                             <button style="background:none;color:#f87171;border:none;cursor:pointer;font-size:10px;">✕</button>\`;
            row.querySelector('button').addEventListener('click', () => {
                customProfanity.splice(idx, 1);
                localStorage.setItem('piper8765_CustomProfanity', JSON.stringify(customProfanity));
                renderFilterPanel();
            });
            listEl.appendChild(row);
        });
        
        return panel;
    }

    function buildUI() {
        const floatBtn = document.createElement('button');
        floatBtn.id = 'piper-float-btn';
        floatBtn.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647;width:46px;height:46px;border-radius:50%;background:rgba(18,18,21,0.95);border:1px solid rgba(99,102,241,0.4);color:#e5e5e5;font-size:20px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px);';
        floatBtn.innerHTML = '⚙️';
        floatBtn.title = 'Piper Lektor - Ustawienia';
        document.body.appendChild(floatBtn);

        const mainPanel = document.createElement('div');
        mainPanel.id = 'piper-8765-main-panel';
        mainPanel.style.cssText = 'position:fixed;right:24px;bottom:80px;z-index:2147483647;width:250px;background:rgba(14,14,18,0.97);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:14px;display:none;flex-direction:column;gap:10px;color:#e5e5e5;font-family:Inter,system-ui,sans-serif;box-shadow:0 16px 36px rgba(0,0,0,0.85);backdrop-filter:blur(16px);';
        document.body.appendChild(mainPanel);

        floatBtn.addEventListener('click', () => {
            mainPanel.style.display = mainPanel.style.display === 'flex' ? 'none' : 'flex';
            if(isEnabled) floatBtn.style.color = '#818cf8';
        });

        mainPanel.innerHTML = \`
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">
                <strong style="font-size:12px;color:#c7d2fe;font-weight:600;display:flex;align-items:center;gap:6px;">
                  <span style="width:6px;height:6px;border-radius:50%;background:#6366f1;display:inline-block;"></span>
                  Piper • Lektor Napisów
                </strong>
                <button id="piper-panel-close" style="background:transparent;color:#a3a3a3;border:none;cursor:pointer;font-weight:bold;font-size:13px;padding:2px 4px;">✕</button>
            </div>
            
            <button id="piper-toggle-master" style="width:100%;height:32px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;color:#fff;background:#262626;transition:all 0.2s ease;">
                Ładowanie...
            </button>
            
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:10px;color:#a3a3a3;font-weight:500;">Głos lektora:</label>
                <select id="piper-voice-select" style="background:#09090b;color:#f5f5f5;border:1px solid rgba(255,255,255,0.12);padding:5px 8px;font-size:11px;border-radius:8px;outline:none;">
                    \${AVAILABLE_VOICES.map(v => \`<option value="\${v.id}" \${v.id === selectedVoice ? 'selected' : ''}>\${v.name}</option>\`).join('')}
                </select>
            </div>

            <div style="display:flex;flex-direction:column;gap:3px;">
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#a3a3a3;">
                  <span>Prędkość mowy:</span>
                  <span id="piper-rate-val" style="color:#818cf8;font-weight:600;">\${speechRate.toFixed(1)}x</span>
                </div>
                <input type="range" id="piper-rate-slider" min="0.5" max="2.5" step="0.1" value="\${speechRate}" style="width:100%;cursor:pointer;accent-color:#6366f1;">
            </div>

            <div style="display:flex;flex-direction:column;gap:3px;">
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#a3a3a3;">
                  <span>Głośność Lektora (Boost):</span>
                  <span id="piper-boost-val" style="color:#818cf8;font-weight:600;">\${ttsBoost.toFixed(1)}x</span>
                </div>
                <input type="range" id="piper-boost-slider" min="0.5" max="5.0" step="0.1" value="\${ttsBoost}" style="width:100%;cursor:pointer;accent-color:#6366f1;">
            </div>

            <div style="display:flex;flex-direction:column;gap:3px;">
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#a3a3a3;">
                  <span>Wyciszenie wideo (Duck):</span>
                  <span id="piper-duck-val" style="color:#818cf8;font-weight:600;">\${duckVolumePct}%</span>
                </div>
                <input type="range" id="piper-duck-slider" min="0" max="100" step="5" value="\${duckVolumePct}" style="width:100%;cursor:pointer;accent-color:#6366f1;">
            </div>

            <button id="piper-filter-btn" style="width:100%;height:28px;background:#18181c;color:#e5e5e5;border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                ⚙️ Opcje Kart, YouTube & Filtr
            </button>
            
            <div id="piper-8765-status" style="font-size:10px;color:#737373;font-style:italic;word-wrap:break-word;min-height:14px;max-height:36px;overflow:hidden;line-height:1.3;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;"></div>
        \`;

        mainPanel.querySelector('#piper-panel-close').addEventListener('click', () => mainPanel.style.display = 'none');
        
        const masterBtn = mainPanel.querySelector('#piper-toggle-master');
        masterBtn.addEventListener('click', toggleMasterSwitch);
        if (isEnabled) {
            masterBtn.textContent = '● Lektor: WŁĄCZONY';
            masterBtn.style.background = '#4f46e5';
            masterBtn.style.border = '1px solid rgba(99,102,241,0.5)';
            floatBtn.style.color = '#818cf8';
        } else {
            masterBtn.textContent = '○ Lektor: WYŁĄCZONY';
            masterBtn.style.background = '#262626';
            floatBtn.style.color = '#e5e5e5';
        }

        mainPanel.querySelector('#piper-voice-select').addEventListener('change', (e) => {
            selectedVoice = e.target.value;
            saveSettings();
        });

        const rateSlider = mainPanel.querySelector('#piper-rate-slider');
        const rateVal = mainPanel.querySelector('#piper-rate-val');
        rateSlider.addEventListener('input', (e) => {
            speechRate = parseFloat(e.target.value);
            rateVal.textContent = speechRate.toFixed(1) + 'x';
            saveSettings();
        });

        const boostSlider = mainPanel.querySelector('#piper-boost-slider');
        const boostVal = mainPanel.querySelector('#piper-boost-val');
        boostSlider.addEventListener('input', (e) => {
            ttsBoost = parseFloat(e.target.value);
            boostVal.textContent = ttsBoost.toFixed(1) + 'x';
            saveSettings();
            if(imtCurrentGain) imtCurrentGain.gain.value = ttsBoost;
        });

        const duckSlider = mainPanel.querySelector('#piper-duck-slider');
        const duckVal = mainPanel.querySelector('#piper-duck-val');
        duckSlider.addEventListener('input', (e) => {
            duckVolumePct = parseInt(e.target.value, 10);
            duckVal.textContent = duckVolumePct + '%';
            saveSettings();
            if(imtSpeaking) duckVideos();
        });

        mainPanel.querySelector('#piper-filter-btn').addEventListener('click', () => {
            const fPanel = document.getElementById('piper-8765-filter-panel') || renderFilterPanel();
            fPanel.style.display = fPanel.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUI);
    } else {
        buildUI();
    }

})();`;

// --- KOD BOOKMARKLET (SKRYPTOZAKŁADKA - NIE WYMAGA ŻADNYCH WTYCZEK ANI TAMPERMONKEY!) ---
export const BOOKMARKLET_CODE = `javascript:(function(){if(window.__PIPER_8765_IMMERSIVE_RUNNING__){alert('Piper Lektor jest juz wlaczony na tej stronie!');return;}var s=document.createElement('script');s.src='http://127.0.0.1:8765/piper-injector.js';s.onerror=function(){${EXACT_USERSCRIPT_CODE.replace(/\n/g, ' ').replace(/\s+/g, ' ')}};document.body.appendChild(s);})();`;

// --- KONSOLA PRZEGLĄDARKI (F12) ---
export const BROWSER_CONSOLE_SNIPPET = EXACT_USERSCRIPT_CODE;

// --- MANIFEST V3 DLA WŁASNEGO ROZSZERZENIA CHROME (BEZ TAMPERMONKEY) ---
export const CHROME_MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Piper Lektor PL",
  "version": "2.5.1",
  "description": "Lektor napisów AI dla Netflix, YouTube, Prime Video, Disney+ z polskim głosem Piper TTS.",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "http://127.0.0.1:8765/*",
    "http://localhost:8765/*",
    "*://*/*"
  ],
  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}`;
