/**
 * Guru Questions Database
 * Organized by difficulty level for adaptive learning
 */

export interface GuruQuestion {
  id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  sanskrit: string; // Devanagari
  iast: string; // Latin transliteration
  englishContext: string;
  expectedResponse: string[]; // Multiple acceptable answers
  hints: string[];
  pronunciation: string; // Phonetic breakdown
  category: 'greeting' | 'mantra' | 'translation' | 'conversation' | 'grammar';
}

export const GURU_QUESTIONS: GuruQuestion[] = [
  {
    id: 'beginner_1',
    level: 'beginner',
    sanskrit: 'नमस्ते',
    iast: 'namaste',
    englishContext: 'Guru greets the sishya. The sishya should respond appropriately.',
    expectedResponse: ['namaste', 'namaskar', 'namaskaaram'],
    hints: [
      'A respectful greeting in Sanskrit',
      'Literally means "I bow to you"',
      'Common response to namaste is namaste back',
    ],
    pronunciation: 'nah-mah-STEH',
    category: 'greeting',
  },
  {
    id: 'beginner_2',
    level: 'beginner',
    sanskrit: 'ॐ नमः शिवाय',
    iast: 'om namah shivaya',
    englishContext: 'Guru teaches a sacred mantra. Recite it back.',
    expectedResponse: ['om namah shivaya', 'aum namaha shivaya'],
    hints: [
      'One of the most sacred mantras',
      'Om + salutations to Shiva',
      'Pronounce each syllable clearly',
    ],
    pronunciation: 'OHM NAH-mah SHEE-vah-yah',
    category: 'mantra',
  },
  {
    id: 'beginner_3',
    level: 'beginner',
    sanskrit: 'कथं नाम तव?',
    iast: 'katham naam tava?',
    englishContext: 'Guru asks: "What is your name?" Respond with your name in Sanskrit.',
    expectedResponse: ['aham... iti nama mama', 'mama naam...'],
    hints: [
      'Answer in format: "My name is..."',
      'Use "mama naam" for "my name is"',
      'State your name clearly',
    ],
    pronunciation: 'kah-THUM NAHM tah-vah',
    category: 'conversation',
  },
  {
    id: 'intermediate_1',
    level: 'intermediate',
    sanskrit: 'तत् त्वम् असि',
    iast: 'tat tvam asi',
    englishContext: 'Guru teaches a fundamental truth from Upanishads: "That thou art". Translate it.',
    expectedResponse: ['that thou art', 'that you are', 'you are that'],
    hints: [
      'One of the Mahavakyas',
      'Expresses non-duality',
      'Tat = that, Tvam = you, Asi = are',
    ],
    pronunciation: 'taht TVAHM AH-see',
    category: 'translation',
  },
  {
    id: 'intermediate_2',
    level: 'intermediate',
    sanskrit: 'अहं ब्रह्मास्मि',
    iast: 'aham brahmasmi',
    englishContext: 'Guru chants another Mahavakya. What does it mean?',
    expectedResponse: ['i am brahman', 'aham is brahman', 'i am the brahman'],
    hints: [
      'Aham = I, Brahma = Brahman (ultimate reality)',
      'Asmi = am',
      'Core teaching of Advaita Vedanta',
    ],
    pronunciation: 'ah-HUM BRAH-mah-SMEE',
    category: 'translation',
  },
  {
    id: 'intermediate_3',
    level: 'intermediate',
    sanskrit: 'सत्यं ज्ञानं अनन्तं ब्रह्म',
    iast: 'satyam jnanam anantam brahma',
    englishContext: 'Guru teaches about the nature of Brahman. What are the three qualities?',
    expectedResponse: ['truth knowledge infinite', 'sat chit ananda', 'truth consciousness bliss'],
    hints: [
      'Satyam = Truth/Reality',
      'Jnanam = Knowledge/Consciousness',
      'Anantam = Infinite',
    ],
    pronunciation: 'sah-TYUM GYAH-num ah-NUN-tum BRAH-mah',
    category: 'translation',
  },
  {
    id: 'advanced_1',
    level: 'advanced',
    sanskrit: 'को हि भगवान्?',
    iast: 'ko hi bhagavan?',
    englishContext: 'Guru asks a philosophical question: "Who is the Lord?" Provide a vedantic answer.',
    expectedResponse: [
      'brahma eva bhagavan',
      'tat satyam',
      'atma eva bhagavan',
    ],
    hints: [
      'Ko = who, Hi = indeed, Bhagavan = Lord',
      'Consider the Vedantic perspective',
      'The answer relates to the ultimate reality',
    ],
    pronunciation: 'koh HEE bah-gah-VAHN',
    category: 'conversation',
  },
  {
    id: 'advanced_2',
    level: 'advanced',
    sanskrit: 'मोक्षं प्राप्य कथं जीवनं यापयामः?',
    iast: 'mokshan praapya katham jivanam yapayamaha?',
    englishContext:
      'Guru poses: "Having attained liberation, how do we live?" A complex grammar question.',
    expectedResponse: [
      'jivanmukta bhavati',
      'sahaja samadhi',
      'brahma sthitah',
    ],
    hints: [
      'Moksh = liberation, Praapya = having attained',
      'Katham = how, Jivanam = life',
      'Advanced grammar with conditional forms',
    ],
    pronunciation: 'moke-SHUM PRAAH-pyah KAH-thum JEE-vuh-num YAH-puh-YAH-mah',
    category: 'grammar',
  },
];

export const GURU_CORRECTIONS: Record<string, string[]> = {
  'om namah shivaya': [
    'Make sure to pronounce "om" as a full syllable OHM, not just AUM',
    'The "sh" in shivaya should be soft, like "sh" in "show"',
    'Emphasize the second syllable: na-MAH, not NAM-ah',
  ],
  'tat tvam asi': [
    'The retroflex "t" in "tat" requires tongue curling - try again',
    '"Tvam" has a soft "v" sound, not like English w',
    'Stretch the final "i" sound in "asi" - make it prominent',
  ],
  namaste: [
    'Split clearly: na-MA-ste',
    'The "a" in each syllable should be equal length',
    'Soften the final syllable: nas-tay becomes nas-teh',
  ],
};

/**
 * Get random question based on difficulty level
 */
export function getRandomQuestion(level?: 'beginner' | 'intermediate' | 'advanced'): GuruQuestion {
  const filtered = level ? GURU_QUESTIONS.filter((q) => q.level === level) : GURU_QUESTIONS;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Get next question based on current performance
 */
export function getAdaptiveQuestion(currentLevel: 'beginner' | 'intermediate' | 'advanced', 
  performanceScore: number): GuruQuestion {
  if (performanceScore > 80 && currentLevel !== 'advanced') {
    return getRandomQuestion('intermediate');
  }
  if (performanceScore > 90 && currentLevel === 'intermediate') {
    return getRandomQuestion('advanced');
  }
  if (performanceScore < 60) {
    return getRandomQuestion('beginner');
  }
  return getRandomQuestion(currentLevel);
}

/**
 * Check if response matches expected answer (fuzzy matching)
 */
export function isValidResponse(userResponse: string, expectedResponses: string[]): boolean {
  const normalized = userResponse.toLowerCase().trim();
  return expectedResponses.some((expected) => {
    const normalizedExpected = expected.toLowerCase().trim();
    // Simple exact match or contains match
    if (normalized === normalizedExpected) return true;
    // Check if contains all words (order-independent)
    const userWords = normalized.split(/\s+/);
    const expectedWords = normalizedExpected.split(/\s+/);
    const matchedWords = expectedWords.filter((word) => 
      userWords.some((uWord) => uWord.includes(word) || word.includes(uWord))
    );
    return matchedWords.length >= Math.ceil(expectedWords.length * 0.7); // 70% match
  });
}

/**
 * Get pronunciation feedback
 */
export function getPronunciationFeedback(sanskritText: string, userAudio?: string): string {
  const feedback = GURU_CORRECTIONS[sanskritText.toLowerCase()] || [];
  if (feedback.length === 0) {
    return '✓ Pronunciation was clear and accurate! Well done!';
  }
  return feedback[Math.floor(Math.random() * feedback.length)];
}
