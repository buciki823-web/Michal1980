import React, { useState } from 'react';
import { Shield, Sparkles, Plus, Trash2, Check, AlertTriangle, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { ScriptSettings, FilterMode } from '../types';
import { PROFANITY_LIST, sanitizeText, censorText } from '../utils/textProcessor';

interface TextFilterPlaygroundProps {
  settings: ScriptSettings;
  updateSettings: (newSettings: Partial<ScriptSettings>) => void;
}

const PRESET_TESTS = [
  {
    title: 'Nawiasy didaskaliów (filmy)',
    input: '(napięta muzyka) Zamknij te przeklęte drzwi! [słychać trzask]',
    note: 'Wycinanie nawiasów okrągłych i kwadratowych'
  },
  {
    title: 'Zapętlenia Immersive Translate',
    input: 'translating, translating, translating Dzień dobry, witamy w naszym programie.',
    note: 'Usuwanie powtórzeń artefaktów tłumacza'
  },
  {
    title: 'Nawiasy azjatyckie i klamrowe',
    input: '【Ważny komunikat】 {odgłos silnika} System gotowy do startu.',
    note: 'Obsługa znaków 【 】 oraz { }'
  },
  {
    title: 'Wulgaryzmy & Cenzura',
    input: 'Kurwa, znowu ten cholerny błąd w systemie! Ja pierdolę...',
    note: 'Test trybów: usuń słowo, [BEEP], Za*****j'
  }
];

export const TextFilterPlayground: React.FC<TextFilterPlaygroundProps> = ({
  settings,
  updateSettings
}) => {
  const [testInput, setTestInput] = useState(
    '(drzwi skrzypią) translating, translating Kurwa, znowu ten cholerny alarm! [odgłos strzału]'
  );
  const [newCustomWord, setNewCustomWord] = useState('');

  const sanitized = sanitizeText(testInput, settings.filterBrackets, settings.filterArtifacts);
  const finalOutput = censorText(
    testInput,
    settings.filterBrackets,
    settings.filterArtifacts,
    settings.filterEnabled,
    settings.filterMode,
    settings.customProfanity
  );

  const handleAddWord = () => {
    const w = newCustomWord.replace(/\s+/g, ' ').trim().toLowerCase();
    if (w && !settings.customProfanity.includes(w)) {
      updateSettings({ customProfanity: [...settings.customProfanity, w] });
      setNewCustomWord('');
    }
  };

  const handleRemoveWord = (idx: number) => {
    const list = [...settings.customProfanity];
    list.splice(idx, 1);
    updateSettings({ customProfanity: list });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400 shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Laboratorium Czyszczenia Tekstu i Filtrów Cenzury
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Przetestuj na żywo reguły sanifikacji napisów przed wysłaniem ich do syntezatora mowy Piper TTS.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Tester & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Input Box */}
          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                Tekst wejściowy (z napisów):
              </label>
              <span className="text-xs text-neutral-500 font-mono">
                {testInput.length} znaków
              </span>
            </div>

            <textarea
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full bg-[#09090b] border border-neutral-700/80 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono leading-relaxed transition"
              placeholder="Wpisz tekst zawierający nawiasy, powtórzenia lub wulgaryzmy..."
            />

            {/* Quick Test Presets */}
            <div className="space-y-2">
              <span className="text-xs text-neutral-400 font-medium">Szybkie przykłady:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRESET_TESTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTestInput(preset.input)}
                    className="text-left p-3 rounded-xl bg-[#0e0e11]/80 border border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-800/40 transition text-xs group"
                  >
                    <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{preset.note}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transformation Results Pipeline */}
          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-indigo-400" />
              Wynik Przetwarzania w Skrypcie
            </h3>

            {/* Step 1: Sanitization */}
            <div className="p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Krok 1: Sanityzacja (Nawiasy & Artefakty)</span>
                <span className="font-mono text-[10px] text-neutral-500">sanitizeText()</span>
              </div>
              <div className="text-sm font-mono text-neutral-200 bg-[#141418] p-2.5 rounded-lg border border-neutral-800/80">
                {sanitized || <span className="text-neutral-500 italic">[Pusty tekst po wyczyszczeniu]</span>}
              </div>
            </div>

            {/* Step 2: Censorship & Final Text for Piper TTS */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-700/40 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs text-indigo-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Krok 2: Końcowy tekst wysyłany do Piper TTS:
                </span>
                <span className="font-mono text-[10px] text-indigo-400/80">censorText()</span>
              </div>
              <div className="text-sm font-mono text-indigo-100 bg-[#09090b] p-3 rounded-lg border border-indigo-600/30 font-semibold shadow-inner">
                {finalOutput || <span className="text-neutral-500 italic">[Pusty - lektor nie zostanie wywołany]</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Rules Configuration & Custom Profanity List (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Rules Switches */}
          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-white">Aktywne Reguły Filtrowania</h3>

            <div className="space-y-3">
              {/* Filter brackets */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 cursor-pointer hover:border-neutral-700 transition">
                <input
                  type="checkbox"
                  checked={settings.filterBrackets}
                  onChange={(e) => updateSettings({ filterBrackets: e.target.checked })}
                  className="mt-0.5 rounded accent-indigo-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">Ignoruj nawiasy ( ), [ ], {'{ }'}, 【 】</div>
                  <div className="text-neutral-400 mt-0.5 leading-relaxed">
                    Wycina opisy dźwięków, didaskalia i oznaczenia aktorów.
                  </div>
                </div>
              </label>

              {/* Filter artifacts */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 cursor-pointer hover:border-neutral-700 transition">
                <input
                  type="checkbox"
                  checked={settings.filterArtifacts}
                  onChange={(e) => updateSettings({ filterArtifacts: e.target.checked })}
                  className="mt-0.5 rounded accent-indigo-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">Usuń powtórzenia i "translating"</div>
                  <div className="text-neutral-400 mt-0.5 leading-relaxed">
                    Wycina zapętlone artefakty wtyczek tłumaczących w przeglądarce.
                  </div>
                </div>
              </label>

              {/* Filter enabled */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 cursor-pointer hover:border-neutral-700 transition">
                <input
                  type="checkbox"
                  checked={settings.filterEnabled}
                  onChange={(e) => updateSettings({ filterEnabled: e.target.checked })}
                  className="mt-0.5 rounded accent-indigo-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-white">Cenzura przekleństw</div>
                  <div className="text-neutral-400 mt-0.5 leading-relaxed">
                    Włącza filtrowanie słów wulgarnych w wybranym trybie.
                  </div>
                </div>
              </label>

              {/* Filter Mode Selector */}
              <div className="p-3.5 rounded-xl bg-[#09090b] border border-neutral-800 space-y-2">
                <label className="text-xs font-semibold text-neutral-300">
                  Tryb cenzury wulgaryzmów:
                </label>
                <select
                  value={settings.filterMode}
                  onChange={(e) => updateSettings({ filterMode: e.target.value as FilterMode })}
                  className="w-full bg-[#141418] border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="remove">Usuń słowo całkowicie ("")</option>
                  <option value="beep">Zastąp znacznikiem "[BEEP]"</option>
                  <option value="replace">Zamaskuj gwiazdkami ("Za*****j")</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom Profanity Words Manager */}
          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Własna Lista Słów do Cenzury</h3>
              <span className="text-xs text-neutral-400 font-mono">
                {settings.customProfanity.length} dodanych
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Wpisz słowo (np. głupek)..."
                value={newCustomWord}
                onChange={(e) => setNewCustomWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                className="flex-1 bg-[#09090b] border border-neutral-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                onClick={handleAddWord}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Dodaj
              </button>
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {settings.customProfanity.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-500 italic">
                  Brak dodatkowych słów. Domyślna baza zawiera standardowe polskie wulgaryzmy.
                </div>
              ) : (
                settings.customProfanity.map((word, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090b] border border-neutral-800 text-xs"
                  >
                    <span className="text-rose-300 font-mono font-medium">{word}</span>
                    <button
                      onClick={() => handleRemoveWord(idx)}
                      className="text-neutral-500 hover:text-rose-400 transition"
                      title="Usuń słowo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2.5 border-t border-neutral-800/80 text-[11px] text-neutral-500 leading-relaxed">
              Wbudowana baza zawiera: <span className="text-neutral-400 font-mono">kurwa, chuj, pierdol, jebać, dupa, gówno, szmata, cipa, cholera, pieprz</span>...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
