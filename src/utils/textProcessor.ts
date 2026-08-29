export const PROFANITY_LIST = [
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

// Wyrażenia systemowe, podpowiedzi Immersive Translate i YouTube UI, które nie powinny być czytane
const SYSTEM_UI_PATTERNS = [
  /enable\s+subtitles\s+translation/gi,
  /translation\s+subtitles/gi,
  /subtitles\s+translation/gi,
  /click\s+to\s+translate/gi,
  /immersive\s+translate/gi,
  /włącz\s+tłumaczenie\s+napisów/gi,
  /tłumaczenie\s+napisów/gi,
  /translat(?:ing|ed|e)/gi,
  /auto-generated/gi,
  /wygenerowane\s+automatycznie/gi
];

export function sanitizeText(
  text: string,
  filterBrackets: boolean = true,
  filterArtifacts: boolean = true
): string {
  if (!text) return '';
  let result = text;

  // 1. Odrzucenie / wyczyszczenie komunikatów UI Immersive Translate ("enable subtitles translation", itp.)
  for (const pattern of SYSTEM_UI_PATTERNS) {
    result = result.replace(pattern, '');
  }

  // 2. Usuwanie treści w nawiasach: (), [], {}, 【】
  if (filterBrackets) {
    result = result.replace(/[\(\[\{\（\【][^\)\}\]\）\】]*[\)\}\]\）\】]/gi, '');
  }

  // 3. Usuwanie zapętlonych powtórzeń słów (np. "subtitles subtitles", "translating, translating")
  if (filterArtifacts) {
    result = result.replace(/\b(\w+)(?:[\s,.-]+\1)+\b/gi, '$1');
  }

  return result.replace(/\s+/g, ' ').trim();
}

export function isSystemPrompt(text: string): boolean {
  if (!text) return true;
  const clean = text.trim().toLowerCase();
  if (clean.length < 2) return true;
  if (/^(?:enable\s+subtitles|translation\s+subtitles|subtitles\s+translation|immersive\s+translate|translating|subtitles)$/i.test(clean)) {
    return true;
  }
  return false;
}

export function censorText(
  text: string,
  filterBrackets: boolean = true,
  filterArtifacts: boolean = true,
  filterEnabled: boolean = true,
  filterMode: 'remove' | 'beep' | 'replace' = 'remove',
  customProfanity: string[] = []
): string {
  const cleaned = sanitizeText(text, filterBrackets, filterArtifacts);
  if (isSystemPrompt(cleaned)) return '';
  if (!filterEnabled || !cleaned) return cleaned;

  const fullList = PROFANITY_LIST.concat(customProfanity);
  if (!fullList.length) return cleaned;

  let result = cleaned;
  const pattern = new RegExp('(' + fullList.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  
  switch (filterMode) {
    case 'remove':
      result = result.replace(pattern, '');
      break;
    case 'beep':
      result = result.replace(pattern, '[BEEP]');
      break;
    case 'replace':
    default:
      result = result.replace(pattern, (match) => match[0] + '*'.repeat(Math.max(1, match.length - 1)));
      break;
  }
  
  return result.replace(/\s+/g, ' ').trim();
}
