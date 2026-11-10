/**
 * Simple IAST to Devanagari Transliteration Utility
 * This handles common Sanskrit vowel and consonant mappings.
 */

const VOWEL_MAP: Record<string, string> = {
    'a': 'अ', 'ā': 'आ', 'i': 'इ', 'ī': 'ई', 'u': 'उ', 'ū': 'ऊ', 'ṛ': 'ऋ', 'ṝ': 'ॠ',
    'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'aṃ': 'अं', 'aḥ': 'अः'
};

const MATRA_MAP: Record<string, string> = {
    'ā': 'ा', 'i': 'ि', 'ī': 'ी', 'u': 'ु', 'ū': 'ू', 'ṛ': 'ृ', 'ṝ': 'ॄ',
    'e': 'े', 'ai': 'ै', 'o': 'ो', 'au': 'ौ'
};

const CONSONANT_MAP: Record<string, string> = {
    'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ṅ': 'ङ',
    'c': 'च', 'ch': 'छ', 'j': 'ज', 'jh': 'झ', 'ñ': 'ञ',
    'ṭ': 'ट', 'ṭh': 'ठ', 'ḍ': 'ड', 'ḍh': 'ढ', 'ṇ': 'ण',
    't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
    'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व',
    'ś': 'श', 'ṣ': 'ष', 's': 'स', 'h': 'ह',
    'ḷ': 'ळ', 'kṣ': 'क्ष', 'jñ': 'ज्ञ'
};

/**
 * Basic transliteration logic (IAST -> Devanagari)
 * This is a simplified version for UX purposes.
 */
export function transliterate(text: string): string {
    let result = "";
    let i = 0;
    const s = text.toLowerCase();

    while (i < s.length) {
        // Handle dual-char consonants (kh, gh, etc.)
        const char2 = s.substring(i, i + 2);
        if (CONSONANT_MAP[char2]) {
            result += CONSONANT_MAP[char2];
            i += 2;
            // Check for following vowels
            if (i < s.length && MATRA_MAP[s[i]]) {
                result += MATRA_MAP[s[i]];
                i++;
            } else if (i < s.length && s[i] === 'a') {
                i++; // Schwa is inherent
            } else {
                result += '्'; // Halant if no vowel follows
            }
            continue;
        }

        const char1 = s[i];
        if (CONSONANT_MAP[char1]) {
            result += CONSONANT_MAP[char1];
            i++;
            // Check for following vowels
            if (i < s.length && MATRA_MAP[s[i]]) {
                result += MATRA_MAP[s[i]];
                i++;
            } else if (i < s.length && s[i] === 'a') {
                i++; // Schwa is inherent
            } else if (i < s.length && (s[i] === ' ' || s[i] === '\n')) {
                // Keep schwa at end of word if desired, but typically halant in modern grammar
                // For Sanskrit, we usually want halant unless it's a-ending
            } else {
                result += '्';
            }
            continue;
        }

        if (VOWEL_MAP[char1]) {
            result += VOWEL_MAP[char1];
            i++;
            continue;
        }

        // Space or punctuation
        result += s[i];
        i++;
    }

    return result;
}
