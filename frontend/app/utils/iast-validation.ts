/**
 * IAST (International Alphabet of Sanskrit Transliteration) Validation
 * Provides character validation and feedback for Sanskrit phonetic input
 */

// Valid IAST characters and their patterns
const VALID_IAST_CHARS = /^[a-zA-Z\s\-ṁṃḥḍḍhṇṛṝḷḹśṣṭṁñṇṛ'\.,:;!?()\[\]""'']*$/;

const IAST_CHARACTER_MAP = {
  vowels: 'aāiīuūṛṝḷḹeaiouāīūṛ',
  consonants: 'kgṅcjñṭḍṇtdnpbmyrlvśṣsh',
  aspirants: 'h',
  specials: 'ṁṃḥ',
};

// Common transliteration patterns
const VALID_CONSONANT_CLUSTERS = [
  'kh', 'gh', 'ch', 'jh', 'ṭh', 'ḍh', 'th', 'dh', 'ph', 'bh', 'sh', 'ṣh',
];

const IAST_EXAMPLES = [
  { text: 'om namah shivaya', meaning: 'Salutations to Shiva' },
  { text: 'om mani padme hum', meaning: 'Jewel in the lotus' },
  { text: 'asato ma sad gamaya', meaning: 'Lead me from illusion to truth' },
  { text: 'tamaso ma jyoti gamaya', meaning: 'Lead me from darkness to light' },
  { text: 'mrityormamritam gamaya', meaning: 'Lead me from death to immortality' },
  { text: 'brahma satyam jagan mithya', meaning: 'Brahman is real, world is illusion' },
  { text: 'tat tvam asi', meaning: 'Thou art that' },
  { text: 'ahambrahmasmi', meaning: 'I am Brahman' },
];

/**
 * Validate IAST phonetic input
 * Returns validation status with specific feedback
 */
export function validateIAST(input: string): {
  isValid: boolean;
  hasUnsupported: boolean;
  unsupportedChars: string[];
  warnings: string[];
} {
  if (!input) {
    return { isValid: true, hasUnsupported: false, unsupportedChars: [], warnings: [] };
  }

  const warnings: string[] = [];
  const unsupportedChars = new Set<string>();

  // Check for unsupported characters
  for (const char of input) {
    if (!/[a-zA-Z\s\-ṁṃḥḍḍhṇṛṝḷḹśṣṭṁñṇṛ'\.,:;!?()\[\]""'']/i.test(char)) {
      unsupportedChars.add(char);
    }
  }

  // Check for common mistakes
  if (input.includes('sh') && input.includes('ś')) {
    warnings.push('Mix of "sh" and "ś" detected. Use one consistently.');
  }
  if (input.includes('kh') && input.includes('ख')) {
    warnings.push('Latin and Devanagari characters mixed.');
  }

  const unsupportedArray = Array.from(unsupportedChars);
  const isValid = unsupportedArray.length === 0;

  return {
    isValid,
    hasUnsupported: unsupportedArray.length > 0,
    unsupportedChars: unsupportedArray,
    warnings,
  };
}

/**
 * Get matching IAST examples for search term
 */
export function getExamples(searchTerm?: string) {
  if (!searchTerm || searchTerm.length === 0) {
    return IAST_EXAMPLES.slice(0, 4);
  }
  
  const term = searchTerm.toLowerCase();
  return IAST_EXAMPLES.filter(
    (ex) =>
      ex.text.toLowerCase().includes(term) ||
      ex.meaning.toLowerCase().includes(term)
  );
}

/**
 * Format error message for display
 */
export function getErrorMessage(validation: ReturnType<typeof validateIAST>): string {
  if (validation.isValid) return '';
  
  if (validation.hasUnsupported) {
    const chars = validation.unsupportedChars.slice(0, 3).join(', ');
    const more = validation.unsupportedChars.length > 3 ? ` +${validation.unsupportedChars.length - 3} more` : '';
    return `Unsupported characters: ${chars}${more}`;
  }

  return 'Invalid input detected';
}

/**
 * Get helpful tip for common IAST issues
 */
export function getIASTTip(): string {
  const tips = [
    'Tip: Use "sh" for ś and "s" for स. Use "ṣ" for retroflex s.',
    'Tip: Long vowels: ā, ī, ū, ṛ, ṝ. Short vowels: a, i, u.',
    'Tip: Use "ñ" for ñ (palatal n) and "ṇ" for retroflex n.',
    'Tip: Aspirated consonants: kh, gh, ch, jh, ṭh, ḍh, th, dh, ph, bh.',
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

export default {
  validateIAST,
  getExamples,
  getErrorMessage,
  getIASTTip,
};
