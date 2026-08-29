import React, { useState } from 'react';
import { ScriptSettings, VoiceOption } from '../types';

interface FloatingScriptWidgetProps {
  settings: ScriptSettings;
  updateSettings: (newSettings: Partial<ScriptSettings>) => void;
  availableVoices: VoiceOption[];
  isServerOnline: boolean | null;
  checkServerHealth: () => void;
  currentReadingText: string;
}

export const FloatingScriptWidget: React.FC<FloatingScriptWidgetProps> = ({
  settings,
  updateSettings,
  availableVoices,
  isServerOnline,
  checkServerHealth,
  currentReadingText
}) => {
  const [isMainOpen, setIsMainOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [newWordInput, setNewWordInput] = useState('');

  const handleToggleMaster = () => {
    const nextState = !settings.isEnabled;
    updateSettings({ isEnabled: nextState });
    if (nextState && isServerOnline === false) {
      // In live browser environment, check health
      checkServerHealth();
    }
  };

  const handleAddCustomWord = () => {
    const word = newWordInput.replace(/\s+/g, ' ').trim().toLowerCase();
    if (word && !settings.customProfanity.includes(word)) {
      updateSettings({
        customProfanity: [...settings.customProfanity, word]
      });
      setNewWordInput('');
    }
  };

  const handleRemoveCustomWord = (index: number) => {
    const updated = [...settings.customProfanity];
    updated.splice(index, 1);
    updateSettings({ customProfanity: updated });
  };

  return (
    <>
      {/* Floating Gear Button */}
      <button
        id="piper-float-btn"
        onClick={() => setIsMainOpen(!isMainOpen)}
        title="Piper Lektor - Ustawienia"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 9999,
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: 'rgba(18, 18, 21, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          color: settings.isEnabled ? '#818cf8' : '#e5e5e5',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease',
          backdropFilter: 'blur(12px)',
        }}
        className="hover:scale-105 active:scale-95 hover:border-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
      >
        ⚙️
      </button>

      {/* Main Settings Panel */}
      {isMainOpen && (
        <div
          id="piper-8765-main-panel"
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '80px',
            zIndex: 9999,
            width: '250px',
            background: 'rgba(14, 14, 18, 0.97)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            color: '#e5e5e5',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 16px 36px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
            <strong style={{ fontSize: '12px', color: '#c7d2fe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }}></span>
              Piper • Lektor Napisów
            </strong>
            <button
              id="piper-panel-close"
              onClick={() => setIsMainOpen(false)}
              style={{ background: 'transparent', color: '#a3a3a3', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', padding: '2px 4px' }}
              className="hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Master Switch */}
          <button
            id="piper-toggle-master"
            onClick={handleToggleMaster}
            style={{
              width: '100%',
              height: '32px',
              border: settings.isEnabled ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#fff',
              background: settings.isEnabled ? '#4f46e5' : '#262626',
              transition: 'all 0.2s ease',
              boxShadow: settings.isEnabled ? '0 0 14px rgba(99, 102, 241, 0.35)' : 'none'
            }}
          >
            {settings.isEnabled ? '● Lektor: WŁĄCZONY' : '○ Lektor: WYŁĄCZONY'}
          </button>

          {/* Voice selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#a3a3a3', fontWeight: 500 }}>Głos lektora:</label>
            <select
              id="piper-voice-select"
              value={settings.selectedVoice}
              onChange={(e) => updateSettings({ selectedVoice: e.target.value })}
              style={{ background: '#09090b', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 8px', fontSize: '11px', borderRadius: '8px', outline: 'none' }}
            >
              {availableVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender === 'male' ? 'Męski' : 'Żeński'})
                </option>
              ))}
            </select>
          </div>

          {/* Speech rate slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#a3a3a3' }}>
              <span>Prędkość mowy:</span>
              <span id="piper-rate-val" style={{ color: '#818cf8', fontWeight: 600 }}>{settings.speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              id="piper-rate-slider"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }}
            />
          </div>

          {/* TTS Boost slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#a3a3a3' }}>
              <span>Głośność Lektora (Boost):</span>
              <span id="piper-boost-val" style={{ color: '#818cf8', fontWeight: 600 }}>{settings.ttsBoost.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              id="piper-boost-slider"
              min="0.5"
              max="5.0"
              step="0.1"
              value={settings.ttsBoost}
              onChange={(e) => updateSettings({ ttsBoost: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }}
            />
          </div>

          {/* Ducking slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#a3a3a3' }}>
              <span>Wyciszenie wideo (Duck):</span>
              <span id="piper-duck-val" style={{ color: '#818cf8', fontWeight: 600 }}>{settings.duckVolumePct}%</span>
            </div>
            <input
              type="range"
              id="piper-duck-slider"
              min="0"
              max="100"
              step="5"
              value={settings.duckVolumePct}
              onChange={(e) => updateSettings({ duckVolumePct: parseInt(e.target.value, 10) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }}
            />
          </div>

          {/* Filter Panel trigger */}
          <button
            id="piper-filter-btn"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              width: '100%',
              height: '28px',
              background: isFilterOpen ? '#312e81' : '#18181c',
              color: '#e5e5e5',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
          >
            ⚙️ Reguły Filtru Tekstu / Cenzury
          </button>

          {/* Status Label */}
          <div
            id="piper-8765-status"
            style={{
              fontSize: '10px',
              color: '#737373',
              fontStyle: 'italic',
              wordWrap: 'break-word',
              minHeight: '14px',
              maxHeight: '36px',
              overflow: 'hidden',
              lineHeight: '1.3',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '6px'
            }}
          >
            {currentReadingText ? `(Czyta): ${currentReadingText}` : settings.isEnabled ? 'Oczekiwanie na napisy...' : ''}
          </div>
        </div>
      )}

      {/* Advanced Filter Panel (Sub-panel) */}
      {isFilterOpen && isMainOpen && (
        <div
          id="piper-8765-filter-panel"
          style={{
            position: 'fixed',
            right: '285px',
            bottom: '80px',
            zIndex: 9999,
            width: '240px',
            background: 'rgba(14, 14, 18, 0.97)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            color: '#e5e5e5',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 16px 36px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
            <strong style={{ color: '#c7d2fe', fontSize: '11px', fontWeight: 600 }}>Koordynacja Kart & Filtr</strong>
            <button
              id="piper-filter-close"
              onClick={() => setIsFilterOpen(false)}
              style={{ background: 'transparent', color: '#a3a3a3', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '0 3px' }}
              className="hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Cross-Tab Audio Focus controls */}
          <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="piper-single-tab-mode"
                checked={settings.singleTabMode}
                onChange={(e) => updateSettings({ singleTabMode: e.target.checked })}
                style={{ accentColor: '#6366f1' }}
              />
              Tylko 1 karta naraz (Audio Focus)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '9px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="piper-auto-mute-hidden"
                checked={settings.autoMuteHiddenTab}
                onChange={(e) => updateSettings({ autoMuteHiddenTab: e.target.checked })}
                style={{ accentColor: '#6366f1' }}
              />
              Wyciszaj kartę w tle po przełączeniu
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '9.5px', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="piper-detect-yt-polish"
                checked={settings.detectYTPolishAudio}
                onChange={(e) => updateSettings({ detectYTPolishAudio: e.target.checked })}
                style={{ accentColor: '#0284c7' }}
              />
              Auto-wykrywaj dubbing PL na YouTube
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4d4d4', fontSize: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              id="piper-filter-brackets"
              checked={settings.filterBrackets}
              onChange={(e) => updateSettings({ filterBrackets: e.target.checked })}
              style={{ accentColor: '#6366f1' }}
            />
            Ignoruj nawiasy ( ), [ ], {'{ }'}, 【】
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4d4d4', fontSize: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              id="piper-filter-artifacts"
              checked={settings.filterArtifacts}
              onChange={(e) => updateSettings({ filterArtifacts: e.target.checked })}
              style={{ accentColor: '#6366f1' }}
            />
            Usuń powtórzenia i "translating"
          </label>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4d4d4', fontSize: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="piper-filter-enabled"
                checked={settings.filterEnabled}
                onChange={(e) => updateSettings({ filterEnabled: e.target.checked })}
                style={{ accentColor: '#6366f1' }}
              />
              Cenzura przekleństw
            </label>
          </div>

          <select
            id="piper-filter-mode"
            value={settings.filterMode}
            onChange={(e) => updateSettings({ filterMode: e.target.value as any })}
            style={{ width: '100%', height: '26px', background: '#09090b', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.12)', fontSize: '10px', borderRadius: '6px', outline: 'none', padding: '0 6px' }}
          >
            <option value="remove">Usuń słowo ("")</option>
            <option value="beep">Zastąp [BEEP]</option>
            <option value="replace">Zamaskuj Za*****j</option>
          </select>

          <div style={{ color: '#737373', fontSize: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
            Własne cenzurowane słowa:
          </div>

          <div style={{ display: 'flex', gap: '5px' }}>
            <input
              id="piper-filter-word-input"
              type="text"
              placeholder="np. cholerka"
              value={newWordInput}
              onChange={(e) => setNewWordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomWord()}
              style={{ flex: 1, height: '24px', background: '#09090b', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontSize: '10px', padding: '0 6px', borderRadius: '6px', outline: 'none' }}
            />
            <button
              id="piper-filter-word-add"
              onClick={handleAddCustomWord}
              style={{ width: '28px', height: '24px', background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}
            >
              +
            </button>
          </div>

          {/* List of custom profanities */}
          <div
            id="piper-filter-word-list"
            style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '90px', overflowY: 'auto' }}
          >
            {settings.customProfanity.length === 0 ? (
              <span style={{ fontSize: '10px', color: '#525252', fontStyle: 'italic', padding: '2px' }}>
                Brak własnych słów
              </span>
            ) : (
              settings.customProfanity.map((w, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1917', padding: '3px 6px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}
                >
                  <span style={{ color: '#fda4af', fontSize: '10px', fontFamily: 'monospace' }}>{w}</span>
                  <button
                    onClick={() => handleRemoveCustomWord(idx)}
                    style={{ background: 'none', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: '10px' }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};
