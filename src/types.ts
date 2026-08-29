export interface VoiceOption {
  id: string;
  name: string;
  description?: string;
  gender: 'male' | 'female';
}

export type FilterMode = 'remove' | 'beep' | 'replace';

export interface ScriptSettings {
  isEnabled: boolean;
  selectedVoice: string;
  duckVolumePct: number; // 0 to 100
  ttsBoost: number; // 0.5 to 5.0
  speechRate: number; // 0.5 to 2.5
  singleTabMode: boolean; // Only 1 tab plays lektor at a time
  autoMuteHiddenTab: boolean; // Auto mute when switching tabs
  detectYTPolishAudio: boolean; // Auto detect Polish audio track/dubbing on YouTube and pause
  filterBrackets: boolean;
  filterArtifacts: boolean;
  filterEnabled: boolean;
  filterMode: FilterMode;
  customProfanity: string[];
}

export interface SubtitleQueueItem {
  id: string;
  text: string;
  sanitizedText: string;
  timestamp: number;
  ready: boolean;
  failed: boolean;
  audioBlobUrl?: string;
}

export interface TestScenario {
  id: string;
  title: string;
  platform: 'Netflix' | 'YouTube' | 'Prime Video' | 'Disney+' | 'Immersive Translate';
  description: string;
  videoSrc?: string;
  subtitles: { time: number; text: string; rawDescription?: string }[];
}
