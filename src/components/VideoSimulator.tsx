import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Sparkles, Sliders, CheckCircle2, AlertCircle, Plus, Layers, FastForward } from 'lucide-react';
import { ScriptSettings, TestScenario, SubtitleQueueItem } from '../types';
import { SAMPLE_SCENARIOS } from '../data/sampleScenarios';
import { sanitizeText, censorText } from '../utils/textProcessor';
import { MultiTabSimulator } from './MultiTabSimulator';

interface VideoSimulatorProps {
  settings: ScriptSettings;
  updateSettings: (newSettings: Partial<ScriptSettings>) => void;
  isServerOnline: boolean | null;
  setCurrentReadingText: (text: string) => void;
}

export const VideoSimulator: React.FC<VideoSimulatorProps> = ({
  settings,
  updateSettings,
  isServerOnline,
  setCurrentReadingText,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<TestScenario>(SAMPLE_SCENARIOS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const [sanitizedSubtitle, setSanitizedSubtitle] = useState<string | null>(null);
  const [queue, setQueue] = useState<SubtitleQueueItem[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [customText, setCustomText] = useState('');
  const [currentVideoVol, setCurrentVideoVol] = useState(100);
  const [speechEngineMode, setSpeechEngineMode] = useState<'piper' | 'browser'>(isServerOnline ? 'piper' : 'browser');

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastProcessedSubRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgGainNodeRef = useRef<GainNode | null>(null);
  const bgOscillatorRef = useRef<OscillatorNode | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Keep speech engine mode in sync with server status
  useEffect(() => {
    if (isServerOnline) {
      setSpeechEngineMode('piper');
    }
  }, [isServerOnline]);

  // Audio Context initialization for audio Ducking simulation
  const initAudioCtx = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Sound generator for background movie soundtrack simulation
  const startBackgroundSound = () => {
    initAudioCtx();
    if (!audioContextRef.current) return;

    try {
      if (bgOscillatorRef.current) {
        bgOscillatorRef.current.stop();
        bgOscillatorRef.current.disconnect();
      }

      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();

      // Atmospheric pad chord (A minor ambient drone)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, audioContextRef.current.currentTime); // A2

      gain.gain.setValueAtTime(0.08, audioContextRef.current.currentTime);
      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);

      osc.start();
      bgOscillatorRef.current = osc;
      bgGainNodeRef.current = gain;
    } catch (e) {
      console.warn('Background sound init error:', e);
    }
  };

  const stopBackgroundSound = () => {
    if (bgOscillatorRef.current) {
      try {
        bgOscillatorRef.current.stop();
        bgOscillatorRef.current.disconnect();
      } catch (e) {}
      bgOscillatorRef.current = null;
    }
    if (bgGainNodeRef.current) {
      try {
        bgGainNodeRef.current.disconnect();
      } catch (e) {}
      bgGainNodeRef.current = null;
    }
  };

  // Play synthetic TTS or local Piper
  const speakText = async (text: string) => {
    if (!settings.isEnabled || !text || text.length < 2) return;

    setIsSpeaking(true);
    setCurrentReadingText(text);

    // Apply Ducking: lower background movie sound to duckVolumePct
    const duckRatio = settings.duckVolumePct / 100;
    setCurrentVideoVol(settings.duckVolumePct);

    if (bgGainNodeRef.current && audioContextRef.current) {
      bgGainNodeRef.current.gain.setTargetAtTime(
        0.08 * duckRatio,
        audioContextRef.current.currentTime,
        0.1
      );
    }

    const onSpeechEnd = () => {
      setIsSpeaking(false);
      setCurrentReadingText('');
      setCurrentVideoVol(100);
      if (bgGainNodeRef.current && audioContextRef.current) {
        bgGainNodeRef.current.gain.setTargetAtTime(
          0.08,
          audioContextRef.current.currentTime,
          0.2
        );
      }
    };

    // Try Piper server if selected & online
    if (speechEngineMode === 'piper') {
      try {
        const res = await fetch('http://127.0.0.1:8765/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
          body: JSON.stringify({
            text: text,
            voice: settings.selectedVoice,
            speed: settings.speechRate
          })
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.volume = Math.min(1.0, (settings.ttsBoost / 2));
          audio.onended = () => {
            URL.revokeObjectURL(url);
            onSpeechEnd();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            // Fallback to browser TTS if audio playback fails
            speakBrowserTts(text, onSpeechEnd);
          };
          await audio.play();
          return;
        }
      } catch (err) {
        // Fallback to browser TTS on network fail
      }
    }

    // Browser Web Speech API fallback
    speakBrowserTts(text, onSpeechEnd);
  };

  const speakBrowserTts = (text: string, onEnd: () => void) => {
    if (!('speechSynthesis' in window)) {
      setTimeout(onEnd, 1500);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = Math.max(0.5, Math.min(2.5, settings.speechRate));
    utterance.volume = Math.min(1.0, settings.ttsBoost / 2);

    // Try finding Polish voice
    const voices = window.speechSynthesis.getVoices();
    const plVoice = voices.find(v => v.lang.includes('pl') || v.lang.includes('PL'));
    if (plVoice) utterance.voice = plVoice;

    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopBackgroundSound();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentReadingText('');
      setCurrentVideoVol(100);
      return;
    }

    startBackgroundSound();
    const startTimestamp = performance.now() - currentTime * 1000;
    const maxDuration = Math.max(...selectedScenario.subtitles.map(s => s.time)) + 5;

    const tick = (now: number) => {
      const elapsedSec = (now - startTimestamp) / 1000;
      if (elapsedSec > maxDuration) {
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }

      setCurrentTime(elapsedSec);

      // Check current subtitle for this timestamp
      const active = selectedScenario.subtitles
        .slice()
        .reverse()
        .find(s => elapsedSec >= s.time && elapsedSec < s.time + 3.8);

      if (active) {
        if (active.text !== lastProcessedSubRef.current) {
          lastProcessedSubRef.current = active.text;
          setCurrentSubtitle(active.text);

          // Run through script text cleaners
          const cleaned = censorText(
            active.text,
            settings.filterBrackets,
            settings.filterArtifacts,
            settings.filterEnabled,
            settings.filterMode,
            settings.customProfanity
          );

          setSanitizedSubtitle(cleaned);

          // Add to queue
          const queueItem: SubtitleQueueItem = {
            id: Math.random().toString(36).substring(2, 9),
            text: active.text,
            sanitizedText: cleaned,
            timestamp: Date.now(),
            ready: true,
            failed: false
          };

          setQueue(prev => [queueItem, ...prev.slice(0, 7)]);

          // Check if YouTube Polish dubbing is detected
          const isYTPolishDetected = selectedScenario.id === 'youtube-polish-dubbing' && settings.detectYTPolishAudio;

          // Read aloud if enabled and not blocked by Polish dubbing detector
          if (settings.isEnabled && cleaned.length >= 2 && !isYTPolishDetected) {
            speakText(cleaned);
          }
        }
      } else {
        if (lastProcessedSubRef.current !== null) {
          lastProcessedSubRef.current = null;
          setCurrentSubtitle(null);
          setSanitizedSubtitle(null);
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopBackgroundSound();
    };
  }, [isPlaying, selectedScenario, settings]);

  const handleScenarioChange = (scenario: TestScenario) => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSubtitle(null);
    setSanitizedSubtitle(null);
    lastProcessedSubRef.current = null;
    setSelectedScenario(scenario);
  };

  const handleManualTrigger = (textToRead: string) => {
    initAudioCtx();
    const cleaned = censorText(
      textToRead,
      settings.filterBrackets,
      settings.filterArtifacts,
      settings.filterEnabled,
      settings.filterMode,
      settings.customProfanity
    );

    setCurrentSubtitle(textToRead);
    setSanitizedSubtitle(cleaned);

    const queueItem: SubtitleQueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: textToRead,
      sanitizedText: cleaned,
      timestamp: Date.now(),
      ready: true,
      failed: false
    };
    setQueue(prev => [queueItem, ...prev.slice(0, 7)]);

    if (settings.isEnabled && cleaned.length >= 2) {
      speakText(cleaned);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Scenarios Bar */}
      <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Symulator Strumienia Wideo & Wykrywania Napisów
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              Wybierz platformę strumieniową, aby przetestować działanie selektorów DOM, czyszczenie tekstu i inteligentny ducking audio w czasie rzeczywistym.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-neutral-400">Silnik mowy:</span>
            <div className="flex rounded-xl bg-[#09090b] p-1 border border-neutral-800 text-xs">
              <button
                onClick={() => setSpeechEngineMode('piper')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  speechEngineMode === 'piper'
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Piper (8765)
              </button>
              <button
                onClick={() => setSpeechEngineMode('browser')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  speechEngineMode === 'browser'
                    ? 'bg-neutral-700 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Web TTS (Polski)
              </button>
            </div>
          </div>
        </div>

        {/* Scenario Selection Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {SAMPLE_SCENARIOS.map((sc) => {
            const isSelected = selectedScenario.id === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleScenarioChange(sc)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-neutral-800/90 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/30'
                    : 'bg-[#0e0e11]/80 border-neutral-800/80 hover:bg-neutral-800/40 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#18181c] border border-neutral-700/60 text-neutral-300">
                    {sc.platform}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div className="text-xs font-semibold text-white line-clamp-1">{sc.title}</div>
                <div className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">{sc.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Simulator Stage (Video Player Screen + Live Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Player Box & Subtitle Display (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Simulated Video Frame */}
          <div className="relative aspect-video rounded-2xl bg-[#08080a] border border-neutral-800/90 overflow-hidden shadow-2xl flex flex-col justify-between p-6 select-none group">
            {/* Cinematic Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/30 via-[#0a0a0d]/90 to-[#08080a] -z-10" />

            {/* Video Watermark & Status Headers */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-neutral-700/80 text-neutral-200 font-mono flex items-center gap-1.5 shadow-sm">
                  <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-ping' : 'bg-neutral-500'}`} />
                  {selectedScenario.platform} LIVE STREAM
                </span>
                {isSpeaking && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-600/60 text-indigo-300 font-mono animate-pulse flex items-center gap-1.5 shadow-sm">
                    <Volume2 className="w-3.5 h-3.5" />
                    Lektor Czyta ({settings.selectedVoice})
                  </span>
                )}
              </div>

              {/* Ducking level badge */}
              <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md border border-neutral-700/80 px-3 py-1 rounded-lg text-xs font-mono shadow-sm">
                <span className="text-neutral-400">Głośność Wideo (Ducking):</span>
                <span className={`font-bold ${isSpeaking ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {currentVideoVol}%
                </span>
              </div>
            </div>

            {/* Simulated Scene Graphic */}
            <div className="flex flex-col items-center justify-center text-center space-y-2.5 py-6">
              <div className="w-16 h-16 rounded-2xl bg-[#141418]/90 border border-neutral-700/80 flex items-center justify-center text-neutral-300 shadow-inner">
                {isPlaying ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-6 bg-indigo-400 rounded animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-9 bg-indigo-400 rounded animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-5 bg-indigo-400 rounded animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <Play className="w-7 h-7 text-neutral-300 ml-1 opacity-80" />
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                {isPlaying ? 'Symulacja odtwarzacza w toku (Audio Synth + Ducking aktywny)' : 'Kliknij "Start / Odtwórz", aby rozpocząć symulację napisów'}
              </p>
            </div>

            {/* Authentic Subtitle Display Overlay */}
            <div className="z-10 flex flex-col items-center justify-center space-y-2 min-h-[90px]">
              {selectedScenario.id === 'youtube-polish-dubbing' && settings.detectYTPolishAudio && (
                <div className="px-3.5 py-1.5 rounded-xl bg-sky-950/90 border border-sky-600/70 text-sky-200 text-xs font-semibold flex items-center gap-2 animate-pulse shadow-lg shadow-sky-950/50">
                  <span className="text-base">🇵🇱</span>
                  <span>Wykryto polską ścieżkę dźwiękową / dubbing na YouTube &rarr; Lektor AI wstrzymany (brak nakładania głosu)</span>
                </div>
              )}

              {currentSubtitle ? (
                <div className="space-y-1.5 text-center max-w-2xl px-4 animate-in fade-in zoom-in-95 duration-200">
                  {/* Raw Subtitle as rendered on Netflix/YT */}
                  <div className="imt-captions-text player-timedtext-text-container atvwebplayersdk-captions-text inline-block px-3.5 py-1.5 rounded-lg bg-black/85 text-yellow-300 font-semibold text-sm sm:text-base border border-yellow-500/30 shadow-2xl tracking-wide">
                    {currentSubtitle}
                  </div>

                  {/* Sanitized & Censored Text which Piper TTS actually reads */}
                  {sanitizedSubtitle !== currentSubtitle && (
                    <div>
                      <div className="text-xs px-3 py-1 rounded-lg bg-indigo-950/90 text-indigo-200 border border-indigo-800/60 inline-flex items-center gap-1.5 font-mono shadow-sm">
                        <span className="text-indigo-400">TTS czyta:</span>
                        <strong className="text-white font-normal underline decoration-indigo-500/60">
                          {sanitizedSubtitle || '(Puste po odfiltrowaniu)'}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-neutral-600 italic">
                  [Brak napisów w bieżącym kadrze]
                </div>
              )}
            </div>

            {/* Video Player Progress Bar */}
            <div className="z-10 space-y-2 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span>00:{Math.floor(currentTime).toString().padStart(2, '0')}</span>
                <span>00:{Math.max(...selectedScenario.subtitles.map(s => s.time)) + 5}</span>
              </div>
              <div className="w-full bg-[#18181c] h-2 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="bg-indigo-500 h-full transition-all duration-100 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  style={{
                    width: `${Math.min(
                      100,
                      (currentTime / (Math.max(...selectedScenario.subtitles.map(s => s.time)) + 5)) * 100
                    )}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Player Transport Controls */}
          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <button
                id="sim-play-pause-btn"
                onClick={() => {
                  initAudioCtx();
                  setIsPlaying(!isPlaying);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-md ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" /> Pauza
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" /> Start / Odtwórz
                  </>
                )}
              </button>

              <button
                id="sim-reset-btn"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                  setCurrentSubtitle(null);
                  setSanitizedSubtitle(null);
                  lastProcessedSubRef.current = null;
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 text-xs sm:text-sm font-medium transition border border-neutral-700/80"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>

            {/* Quick Test Manual Custom Subtitle */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="Wpisz dowolny tekst lub napis do przeczytania..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customText) {
                    handleManualTrigger(customText);
                    setCustomText('');
                  }
                }}
                className="flex-1 bg-[#09090b] border border-neutral-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                onClick={() => {
                  if (customText) {
                    handleManualTrigger(customText);
                    setCustomText('');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/80 text-xs font-semibold text-white transition flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                Wyślij
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Subtitle Pipeline & Queue Monitor (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#121215] border border-neutral-800/80 rounded-2xl p-5 shadow-xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800/80">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Kolejka Napisów (imtQueue)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1c1c22] border border-neutral-700/60 text-neutral-300 font-mono">
                  {queue.length} pozycji
                </span>
              </div>

              {/* Subtitle Queue Item List */}
              <div className="space-y-2.5 mt-3.5 max-h-[360px] overflow-y-auto pr-1">
                {queue.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs italic">
                    Brak zdarzeń w kolejce. Włącz symulator lub wpisz testowy napis powyżej.
                  </div>
                ) : (
                  queue.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border text-xs transition-all ${
                        idx === 0
                          ? 'bg-neutral-800/90 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                          : 'bg-[#0a0a0d]/70 border-neutral-800/80 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                        <span className="font-mono text-neutral-500">#{item.id}</span>
                        <span className="text-indigo-400 font-medium">
                          {idx === 0 && isSpeaking ? '▶ W trakcie czytania' : '✓ Przetworzono'}
                        </span>
                      </div>
                      <div className="text-white font-medium leading-relaxed">{item.text}</div>
                      {item.sanitizedText !== item.text && (
                        <div className="mt-1.5 text-[11px] text-indigo-300 flex items-center gap-1 font-mono">
                          <span className="text-neutral-400">Po filtrze:</span>
                          <span className="text-neutral-200">{item.sanitizedText}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Engine Settings Info Card */}
            <div className="pt-4 mt-4 border-t border-neutral-800/80 space-y-2.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Wybrany głos:</span>
                <span className="text-white font-semibold">{settings.selectedVoice}</span>
              </div>
              <div className="flex justify-between">
                <span>Prędkość mowy:</span>
                <span className="text-white font-semibold">{settings.speechRate.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between">
                <span>Wzmocnienie TTS (Boost):</span>
                <span className="text-white font-semibold">{settings.ttsBoost.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between">
                <span>Wyciszenie wideo (Duck):</span>
                <span className="text-white font-semibold">{settings.duckVolumePct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Tab Audio Focus & Multi-Tab Synchronization Simulator */}
      <MultiTabSimulator
        settings={settings}
        updateSettings={updateSettings}
        isServerOnline={isServerOnline}
      />
    </div>
  );
};
