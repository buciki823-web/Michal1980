import { TestScenario } from '../types';

export const SAMPLE_SCENARIOS: TestScenario[] = [
  {
    id: 'youtube-polish-dubbing',
    title: 'YouTube: Wykrywanie Polskiego Dubbingu (Nowość)',
    platform: 'YouTube',
    description: 'Test automatycznego wykrywania ścieżki dźwiękowej "Polski (dubbing)" lub "Polski (oryginalny)" i wstrzymania lektora.',
    subtitles: [
      { time: 1, text: 'Witajcie na kanale! Dzisiaj przetestujemy niesamowity eksperyment naukowy.', rawDescription: 'Wideo posiada oryginalną polską ścieżkę dźwiękową' },
      { time: 5, text: 'Wykryto ścieżkę: Polski (oryginalny) -> Lektor AI automatycznie wstrzymuje czytanie!', rawDescription: 'Status: Auto-wykryto polski dubbing' },
      { time: 10, text: 'Dzięki temu głos lektora nie nakłada się na polskiego twórcę lub polski dubbing YouTube.', rawDescription: 'Brak dublowania głosu' },
      { time: 15, text: 'Gdy przełączysz na wideo po angielsku, lektor wznowi czytanie automatycznie.', rawDescription: 'Inteligentny auto-wznów' }
    ]
  },
  {
    id: 'netflix-thriller',
    title: 'Netflix: Thriller & Efekty w nawiasach',
    platform: 'Netflix',
    description: 'Napisy z didaskaliami w nawiasach typu (szept), [kroki na schodach] oraz wulgaryzmami.',
    subtitles: [
      { time: 1, text: '(napięta muzyka) Wszystko gotowe?', rawDescription: 'Didaskalia (napięta muzyka)' },
      { time: 4, text: 'Nie, cholera, mamy poważny problem!', rawDescription: 'Wulgaryzm: cholera' },
      { time: 7, text: '[odgłos strzału] Uciekaj stąd natychmiast!', rawDescription: 'Kwadratowy nawias: [odgłos strzału]' },
      { time: 11, text: 'Kurwa, zablokowali wszystkie wyjścia...', rawDescription: 'Wulgaryzm do cenzury' },
      { time: 15, text: '(cichy szept) Znam drugą drogę przez piwnicę.', rawDescription: 'Nawias okrągły (cichy szept)' },
      { time: 19, text: 'Trzymaj się blisko mnie.', rawDescription: 'Standardowy dialog' },
    ]
  },
  {
    id: 'immersive-translate-youtube',
    title: 'YouTube + Immersive Translate (Filtrowanie promptów UI & Artefaktów)',
    platform: 'Immersive Translate',
    description: 'Test usuwania promptów UI typu "enable subtitles translation subtitles", zapętleń i nawiasów.',
    subtitles: [
      { time: 1, text: 'enable subtitles translation subtitles', rawDescription: 'Komunikat UI Immersive Translate -> Lektor całkowicie ignoruje!' },
      { time: 4, text: 'translating, translating, translating Witajcie w dzisiejszym odcinku.', rawDescription: 'Artefakt tłumacza: potrójne translating oczyszczone' },
      { time: 8, text: 'Przedstawimy najnowsze osiągnięcia w dziedzinie sztucznej inteligencji.', rawDescription: 'Prawidłowy dialog przetłumaczony' },
      { time: 12, text: 'Click to translate subtitles', rawDescription: 'Prompt systemowy interfejsu -> Zignorowany' },
      { time: 15, text: 'Dzięki Piper TTS lektor działa błyskawicznie i nie czyta zbędnych komunikatów.', rawDescription: 'Prawidłowy tekst' },
      { time: 19, text: '【Ważna informacja】 Pamiętaj o uruchomieniu lokalnego serwera na porcie 8765.', rawDescription: 'Azjatyckie nawiasy 【 】 usunięte' }
    ]
  },
  {
    id: 'prime-action',
    title: 'Amazon Prime Video: Film Akcji i Ducking',
    platform: 'Prime Video',
    description: 'Test wyciszania tła wideo (ducking z 100% do np. 15%) podczas czytania kwestii lektora.',
    subtitles: [
      { time: 1, text: 'Uwaga wszystkim jednostkom, podejrzany ucieka autostradą.', rawDescription: 'Komunikat radiowy' },
      { time: 5, text: '{syrena policyjna} Zablokujcie zjazd numer cztery!', rawDescription: 'Nawias klamrowy { }' },
      { time: 9, text: 'Zrozumiałem, jesteśmy na pozycji.', rawDescription: 'Krótka odpowiedź' },
      { time: 13, text: 'Nie pozwólcie mu dotrzeć do granicy stanu!', rawDescription: 'Dynamiczny rozkaz' }
    ]
  },
  {
    id: 'disney-scifi',
    title: 'Disney+: Sci-Fi & Specjalne Znaczniki',
    platform: 'Disney+',
    description: 'Napisy z dialogami obcych ras, oznaczeniami audio i systemowymi komunikatami.',
    subtitles: [
      { time: 1, text: '(komputer pokładowy) Wykryto anomalię grawitacyjną w sektorze 7.', rawDescription: 'Nawias z narratorem' },
      { time: 5, text: 'Przekieruj całą moc osłon na przedni kadłub!', rawDescription: 'Rozkaz kapitana' },
      { time: 9, text: '[alarm awaryjny] Silniki skokowe gotowe do uruchomienia.', rawDescription: 'Nawiasy kwadratowe' },
      { time: 13, text: 'Skaczemy za trzy, dwa, jeden...', rawDescription: 'Odliczanie' }
    ]
  }
];
