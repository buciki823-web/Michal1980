import React, { useState } from 'react';
import { Code, Download, Copy, Check, ExternalLink, Terminal, ShieldCheck, Cpu, Bookmark, Chrome, PlayCircle, Sparkles, HelpCircle, Layers } from 'lucide-react';
import { EXACT_USERSCRIPT_CODE, BOOKMARKLET_CODE, CHROME_MANIFEST_JSON } from '../data/userScriptCode';

export const ScriptCodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'userscript' | 'bookmarklet' | 'chrome_ext' | 'yt_polish_guide'>('bookmarklet');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDownloadUserScript = () => {
    const blob = new Blob([EXACT_USERSCRIPT_CODE], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gemini1-piper-lektor.user.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExtensionZip = () => {
    // Generowanie plików rozszerzenia
    const manifestBlob = new Blob([CHROME_MANIFEST_JSON], { type: 'application/json;charset=utf-8' });
    const contentBlob = new Blob([EXACT_USERSCRIPT_CODE], { type: 'application/javascript;charset=utf-8' });
    
    // Pobierz manifest.json
    const mLink = document.createElement('a');
    mLink.href = URL.createObjectURL(manifestBlob);
    mLink.download = 'manifest.json';
    document.body.appendChild(mLink);
    mLink.click();
    document.body.removeChild(mLink);

    // Pobierz content.js
    setTimeout(() => {
      const cLink = document.createElement('a');
      cLink.href = URL.createObjectURL(contentBlob);
      cLink.download = 'content.js';
      document.body.appendChild(cLink);
      cLink.click();
      document.body.removeChild(cLink);
    }, 500);
  };

  const codeLines = EXACT_USERSCRIPT_CODE.split('\n');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" />
              Instalacja & Uruchomienie Lektora
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 font-mono">
              v2.5.0 • YouTube Dubbing PL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Nie musisz mieć Tampermonkey! Możesz uruchomić lektora w 1 klik przez <strong className="text-white">Skryptozakładkę (Bookmarklet)</strong>, jako <strong className="text-white">własne rozszerzenie Chrome</strong> lub tradycyjny UserScript.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleDownloadUserScript}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition shadow-indigo-950/40"
          >
            <Download className="w-4 h-4" /> Pobierz .user.js
          </button>
          <button
            onClick={() => handleCopy(EXACT_USERSCRIPT_CODE, 'full_script')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/80 text-neutral-200 text-xs font-semibold transition"
          >
            {copiedCode === 'full_script' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Skopiowano!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Kopiuj kod
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bookmarklet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'bookmarklet'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-[#121215] text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          <Bookmark className="w-4 h-4 text-amber-400" />
          1. Skryptozakładka (Zero instalacji / Bez Tampermonkey)
        </button>

        <button
          onClick={() => setActiveTab('chrome_ext')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'chrome_ext'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-[#121215] text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          <Chrome className="w-4 h-4 text-emerald-400" />
          2. Własne Rozszerzenie Chrome / Edge (Bez Tampermonkey)
        </button>

        <button
          onClick={() => setActiveTab('yt_polish_guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'yt_polish_guide'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-[#121215] text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-sky-400" />
          3. Jak działa wykrywanie lektora PL na YouTube?
        </button>

        <button
          onClick={() => setActiveTab('userscript')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'userscript'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-[#121215] text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          <Code className="w-4 h-4 text-indigo-400" />
          4. Kod Tampermonkey (UserScript)
        </button>
      </div>

      {/* Tab 1: Bookmarklet */}
      {activeTab === 'bookmarklet' && (
        <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <Bookmark className="w-5 h-5" />
            Metoda Najprostsza: Uruchomienie przez Skryptozakładkę (Bookmarklet)
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Nie potrzebujesz żadnego rozszerzenia ani Tampermonkey! Skryptozakładka to zwykła zakładka w przeglądarce, która po kliknięciu na YouTube, Netflixie lub Prime natychmiast włącza pływający widżet lektora ⚙️.
          </p>

          <div className="bg-[#0e0e11] border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-white flex items-center justify-between">
              <span>PRZECIĄGNIJ TEN PRZYCISK DO PASKA ZAKŁADEK PRZEGLĄDARKI:</span>
              <span className="text-[10px] text-amber-400 font-mono">Skrót: Ctrl + Shift + B (pokazuje pasek)</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 py-2">
              <a
                href={BOOKMARKLET_CODE}
                onClick={(e) => {
                  e.preventDefault();
                  alert('Przeciągnij ten przycisk myszką do paska zakładek przeglądarki (lub kliknij "Kopiuj kod zakładki" poniżej)!');
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-amber-950/40 cursor-grab active:cursor-grabbing hover:scale-105 transition transform flex items-center gap-2"
                title="Przeciągnij do paska zakładek"
              >
                🎙️ Włącz Piper Lektor
              </a>

              <button
                onClick={() => handleCopy(BOOKMARKLET_CODE, 'bookmarklet')}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-200 transition flex items-center gap-2"
              >
                {copiedCode === 'bookmarklet' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Skopiowano kod zakładki!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Kopiuj kod zakładki (URL)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3 Step Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-neutral-800 space-y-1.5 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">1</span>
                Dodaj do zakładek
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Przeciągnij przycisk <strong className="text-neutral-200">"🎙️ Włącz Piper Lektor"</strong> do paska zakładek lub stwórz nową zakładkę i wklej skopiowany kod jako adres URL.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-neutral-800 space-y-1.5 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">2</span>
                Wejdź na film
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Otwórz YouTube, Netflix, Prime Video lub dowolną stronę z wideo i włącz napisy (lub Immersive Translate).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-neutral-800 space-y-1.5 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">3</span>
                Kliknij zakładkę
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Kliknij zakładkę na pasku — w prawym dolnym rogu natychmiast pojawi się przycisk ⚙️ lektora i rozpocznie się czytanie!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Chrome Extension */}
      {activeTab === 'chrome_ext' && (
        <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Chrome className="w-5 h-5" />
              Metoda 2: Własne Rozszerzenie Chrome / Edge / Brave (Bez Tampermonkey)
            </div>
            <button
              onClick={handleDownloadExtensionZip}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" /> Pobierz pliki rozszerzenia (manifest.json + content.js)
            </button>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            Możesz zainstalować Piper Lektor jako niezależne, pełnoprawne rozszerzenie w Chrome lub Edge bez potrzeby instalowania jakichkolwiek menedżerów skryptów.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-neutral-800 space-y-2 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">1</span>
                Stwórz folder na dysku
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Stwórz folder np. <code className="text-emerald-400 font-mono">piper-lektor-extension</code> i wrzuć do niego pobrane pliki <strong className="text-neutral-200">manifest.json</strong> oraz <strong className="text-neutral-200">content.js</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-neutral-800 space-y-2 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">2</span>
                Otwórz chrome://extensions
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Wpisz w pasku adresu <code className="text-indigo-400 font-mono">chrome://extensions</code> i włącz przełącznik <strong className="text-neutral-200">"Tryb programisty"</strong> w prawym górnym rogu.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-neutral-800 space-y-2 text-xs">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">3</span>
                Wczytaj rozpakowane
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Kliknij przycisk <strong className="text-neutral-200">"Wczytaj rozpakowane"</strong> i wskaż utworzony folder. Gotowe! Skrypt będzie działał automatycznie na każdej stronie.
              </p>
            </div>
          </div>

          <div className="bg-[#0a0a0d] border border-neutral-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
              <span>PODGLĄD: manifest.json</span>
              <button
                onClick={() => handleCopy(CHROME_MANIFEST_JSON, 'manifest')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedCode === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Kopiuj manifest.json
              </button>
            </div>
            <pre className="p-3 bg-[#060608] rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto">
              {CHROME_MANIFEST_JSON}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: YouTube Polish Dubbing Detection Guide */}
      {activeTab === 'yt_polish_guide' && (
        <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-base">
            <Sparkles className="w-5 h-5" />
            Wykrywanie Polskiego Lektora i Dubbingu na YouTube (Jak to działa?)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-sky-500/30 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                1. Wykrywanie wielojęzycznych ścieżek audio (YouTube Multi-Audio)
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Wiele kanałów na YouTube (np. MrBeast, filmy dokumentalne, animacje) udostępnia oficjalne ścieżki dźwiękowe <strong className="text-white">"Polski (dubbing)"</strong> lub <strong className="text-white">"Polski (oryginalny)"</strong>.
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Skrypt automatycznie pyta API odtwarzacza YouTube (<code className="text-sky-300 font-mono">movie_player.getAudioTrack()</code>) o aktywny język dźwięku.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0a0a0d] border border-indigo-500/30 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                2. Automatyczne wstrzymanie lektora AI (Brak dublowania głosu)
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Gdy skrypt wykryje, że film już mówi po polsku:
              </p>
              <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
                <li><strong className="text-white">Lektor Piper AI natychmiast się wyłącza</strong>,</li>
                <li>Głośność wideo zostaje na 100% (brak wyciszania tła),</li>
                <li>Na widżecie pojawia się status: <code className="text-sky-400 font-mono">🇵🇱 Wykryto polski dubbing na YouTube</code>,</li>
                <li>Gdy włączysz kolejny film po angielsku — lektor wznowi czytanie automatycznie!</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0a0d] border border-neutral-800 space-y-2 text-xs">
            <div className="font-semibold text-neutral-200">Gdzie włączyć tę opcję w widżecie?</div>
            <p className="text-neutral-400 leading-relaxed">
              Opcja jest domyślnie <strong>włączona</strong> w wersji 2.5.0. Możesz ją w dowolnym momencie włączyć lub wyłączyć w okienku widżetu ⚙️ &rarr; <em>"Auto-wykrywaj dubbing PL na YouTube"</em>.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: UserScript */}
      {activeTab === 'userscript' && (
        <div className="bg-[#08080a] border border-neutral-800/90 rounded-2xl overflow-hidden shadow-2xl space-y-0">
          <div className="bg-[#121215]/95 px-5 py-3 border-b border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs text-neutral-400 font-mono ml-2">gemini1.user.js (v2.5.0)</span>
            </div>

            <span className="text-xs text-neutral-500 font-mono">
              {codeLines.length} linii kodu • JavaScript
            </span>
          </div>

          <div className="p-5 overflow-x-auto max-h-[600px] font-mono text-xs text-neutral-300 leading-relaxed select-text">
            <table className="w-full border-collapse">
              <tbody>
                {codeLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/30">
                    <td className="w-12 pr-4 text-right select-none text-neutral-600 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre pl-2">
                      {line.startsWith('//') ? (
                        <span className="text-neutral-500 italic">{line}</span>
                      ) : line.includes('const ') || line.includes('let ') || line.includes('function ') ? (
                        <span>
                          <span className="text-indigo-400">{line.substring(0, line.indexOf(' '))}</span>
                          <span className="text-neutral-200">{line.substring(line.indexOf(' '))}</span>
                        </span>
                      ) : line.includes('http://127.0.0.1:8765') ? (
                        <span className="text-amber-400 font-semibold">{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
