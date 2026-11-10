const SANSKRIT_WORD_MAP: Record<string, string> = {
    om: 'Om',
    aum: 'Om',
    tat: 'that',
    tvam: 'you',
    asi: 'are',
    sarvam: 'everything',
    idam: 'this',
    eva: 'indeed',
    hi: 'indeed',
    ca: 'and',
    va: 'or',
    tu: 'but',
    api: 'also',
    na: 'not',
    iti: 'thus',
    ahaṃ: 'I',
    aham: 'I',
    mama: 'my',
    mayi: 'in me',
    tava: 'your',
    te: 'your',
    me: 'my',
    saha: 'together with',
    namaḥ: 'salutations to',
    namah: 'salutations to',
    namaste: 'salutations to you',
    uttishtha: 'arise',
    uttiṣṭha: 'arise',
    nidra: 'sleep',
    nidram: 'sleep',
    gaccha: 'go',
    gacchati: 'goes',
    punah: 'again',
    punaḥ: 'again',
    jivanam: 'life',
    jīvanam: 'life',
    jeevanam: 'life',
    alpakalam: 'for a short time',
    alpakālam: 'for a short time',
    kartavyam: 'duty',
    kartavyaṃ: 'duty',
    bahulam: 'much',
    bahulaṃ: 'much',
    shraddhavan: 'the faithful one',
    śraddhāvān: 'the faithful one',
    labhate: 'obtains',
    jnanam: 'knowledge',
    jñānam: 'knowledge',
    samyak: 'properly',
    karmani: 'in actions',
    karmāṇi: 'in actions',
    saphalam: 'fruitful',
    saphalaṃ: 'fruitful',
    bhavishyati: 'will be',
    bhaviṣyati: 'will be',
    yat: 'which',
    yath: 'which',
    adya: 'today',
    ārabhase: 'you begin',
    aarabhase: 'you begin',
    arabhase: 'you begin',
    shree: 'auspicious',
    śrī: 'auspicious',
    śrīḥ: 'auspiciousness',
    bhagavan: 'the Lord',
    bhagavān: 'the Lord',
    shiva: 'Shiva',
    śiva: 'Shiva',
    mahadeva: 'Great God',
    mahādeva: 'Great God',
    devi: 'the Goddess',
    guru: 'the Guru',
    agni: 'fire',
    surya: 'sun',
    sūrya: 'sun',
    soma: 'moon',
    rama: 'Rama',
    rāma: 'Rama',
    krishna: 'Krishna',
    kṛṣṇa: 'Krishna',
    hari: 'Vishnu',
    hariḥ: 'Vishnu',
    narayana: 'Narayana',
    nārāyaṇa: 'Narayana',
    saraswati: 'Saraswati',
    lakshmi: 'Lakshmi',
    ganesha: 'Ganesha',
    gaṇeśa: 'Ganesha',
    vishnu: 'Vishnu',
    viṣṇu: 'Vishnu',
    brahma: 'Brahma',
    brahman: 'Brahman',
    ātmā: 'the self',
    atma: 'the self',
    bhavatu: 'may it be',
    bhavantu: 'may they be',
    bhava: 'be',
    bhavati: 'becomes',
    bhavanti: 'become',
    jayati: 'is victorious',
    sarve: 'all',
    sukhino: 'happy',
    sukham: 'happiness',
    sukha: 'happiness',
    shanti: 'peace',
    śāntiḥ: 'peace',
    śānti: 'peace',
    santi: 'peace',
    sahana: 'support together',
    vavatu: 'may it protect',
    nau: 'us both',
    no: 'us',
    kuru: 'do',
    kuruṣva: 'do',
    kr: 'do',
    dharma: 'righteousness',
    adharma: 'unrighteousness',
    sat: 'the real',
    asat: 'the unreal',
    jyotiḥ: 'light',
    jyoti: 'light',
    tamas: 'darkness',
    mrityu: 'death',
    mṛtyu: 'death',
    amrita: 'immortality',
    amṛta: 'immortality',
    jaya: 'victory',
    jayatu: 'victory to',
    bhakti: 'devotion',
    daya: 'compassion',
    dāya: 'compassion',
    prema: 'love',
    mantra: 'sacred chant',
    stotram: 'praise hymn',
    vandana: 'salutation',
    moksha: 'liberation',
    mokṣa: 'liberation',
    guruḥ: 'the Guru',
    param: 'supreme',
    parabrahma: 'the supreme Brahman',
    parabrahman: 'the supreme Brahman',
    shubham: 'auspiciousness',
    śubham: 'auspiciousness',
    lokah: 'worlds',
    lokaḥ: 'worlds',
    samastah: 'all',
    samastāḥ: 'all',
    prajābhyaḥ: 'for the people',
    paripālayantāṃ: 'may they protect',
    sarvadā: 'always',
    sarvada: 'always',
    namo: 'salutations',
};

const PHRASE_MAP: Array<[RegExp, string]> = [
    [/^om\s+namah\s+shivaya$/i, 'Salutations to Shiva.'],
    [/^om\s+namah?\s+shivaya$/i, 'Salutations to Shiva.'],
    [/^om\s+sahana\s+vavatu/i, 'May we be protected together and study in harmony.'],
    [/^lokah?\s+samastah?\s+sukhino\s+bhavantu$/i, 'May all beings everywhere be happy.'],
    [/^asato\s+ma\s+sadgamaya$/i, 'Lead me from the unreal to the real.'],
    [/^tamaso\s+ma\s+jyotirgamaya$/i, 'Lead me from darkness to light.'],
    [/^mrityor?\s+ma\s+amritam\s+gamaya$/i, 'Lead me from death to immortality.'],
    [/^sarve\s+bhavantu\s+sukhinaḥ?$/i, 'May everyone be happy.'],
    [/^guru(r|ḥ)?\s+brahma/i, 'The Guru is Brahma, Vishnu, and Maheshwara.'],
    [/^tat\s+tvam\s+asi$/i, 'That thou art.'],
    [/^ahaṃ\s+brahmāsmi$/i, 'I am Brahman.'],
    [/^ayam\s+ātmā\s+brahma$/i, 'This self is Brahman.'],
];

const SENTENCE_PATTERNS: Array<{
    pattern: RegExp;
    build: (...parts: string[]) => string;
}> = [
    {
        pattern: /^([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s*,?\s*na\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\.?$/i,
        build: (_firstA, _firstB, action1, object1, action2, adverb1) => {
            return `Arise, arise; do not ${action1} ${object1} again.`;
        },
    },
    {
        pattern: /^([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s*,?\s*([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\s+([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+)\.?$/i,
        build: (_firstA, _firstB, subject, verb, adjective, noun) => {
            return `${capitalizeWord(subject)} is ${verb} ${adjective}.`;
        },
    },
];

const COMMON_ENGLISH_WORDS = new Set([
    'the', 'and', 'is', 'are', 'you', 'your', 'my', 'we', 'to', 'for', 'with', 'of',
    'in', 'on', 'from', 'this', 'that', 'be', 'it', 'as', 'a', 'an', 'or', 'not', 'will',
]);

function normalizeAsciiTransliteration(text: string): string {
    return text
        .replace(/aa/g, 'ā')
        .replace(/ii|ee/g, 'ī')
        .replace(/uu|oo/g, 'ū')
        .replace(/\.r/g, 'ṛ')
        .replace(/\brr/g, 'ṝ')
        .replace(/sh/g, 'ś')
        .replace(/Sh/g, 'ś')
        .replace(/kh/g, 'kh')
        .replace(/gh/g, 'gh')
        .replace(/ch/g, 'ch')
        .replace(/jh/g, 'jh')
        .replace(/th/g, 'th')
        .replace(/dh/g, 'dh')
        .replace(/ph/g, 'ph')
        .replace(/bh/g, 'bh')
        .replace(/jn/g, 'jñ')
        .replace(/ny/g, 'ñ')
        .replace(/aa/g, 'ā');
}

function canonicalizeWord(word: string): string {
    const trimmed = word.toLowerCase().replace(/^['-]+|['-]+$/g, '');
    const asciiNormalized = normalizeAsciiTransliteration(trimmed);

    return asciiNormalized
        .replace(/ṁ/g, 'ṃ')
        .replace(/m̐/g, 'ṃ')
        .replace(/ñ/g, 'ñ');
}

function formatEnglishMeaning(text: string): string {
    const collapsed = text.replace(/\s+/g, ' ').trim();
    if (!collapsed) {
        return 'Custom passage entered.';
    }

    return collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
}

function capitalizeWord(text: string): string {
    if (!text) {
        return text;
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function isSanskritLike(text: string): boolean {
    if (/[āīūṛṝḷśṣṅñṭḍṃḥ]/i.test(text)) {
        return true;
    }

    const tokens = text
        .toLowerCase()
        .replace(/[^a-z\s'-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    if (tokens.length === 0) {
        return false;
    }

    const englishWordHits = tokens.filter((token) => COMMON_ENGLISH_WORDS.has(token)).length;
    const sanskritWordHits = tokens.filter((token) => SANSKRIT_WORD_MAP[token] !== undefined).length;

    return sanskritWordHits > 0 || englishWordHits === 0;
}

function translateSanskritLike(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();

    for (const [pattern, meaning] of PHRASE_MAP) {
        if (pattern.test(normalized)) {
            return meaning;
        }
    }

    const sentenceMatch = normalized.toLowerCase().match(/^([a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+(?:\s+[a-zāīūṛṝḷśṣṅñṭḍṃḥ'\-]+){2,})\s*$/i);
    if (sentenceMatch) {
        const sentenceMeaning = translateSentenceByChunks(sentenceMatch[1]);
        if (sentenceMeaning) {
            return sentenceMeaning;
        }
    }

    const words = normalized
        .split(/\s+/)
        .map((word) => canonicalizeWord(word))
        .filter(Boolean);

    if (words.length === 0) {
        return 'Custom passage entered.';
    }

    const gloss = words.map((word) => {
        const stripped = word.replace(/^['-]+|['-]+$/g, '');
        const direct = SANSKRIT_WORD_MAP[stripped];
        if (direct) {
            return direct;
        }

        const deinflected = guessBaseMeaning(stripped);
        return deinflected || stripped;
    });

    return gloss
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .trim()
        .replace(/^./, (char) => char.toUpperCase());
}

function translateSentenceByChunks(sentence: string): string | undefined {
    const cleaned = sentence
        .replace(/[.,;:!?]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const tokens = cleaned.split(' ').map((word) => canonicalizeWord(word)).filter(Boolean);
    if (tokens.length === 0) {
        return undefined;
    }

    const joined = tokens.join(' ');

    if (/^utti[śs]?ṭha\s+utti[śs]?ṭha/.test(joined)) {
        const remaining = tokens.slice(2);
        return `Arise, arise; ${translateClause(remaining)}`.replace(/^./, (char) => char.toUpperCase());
    }

    if (/^shraddhāvān|^śraddhāvān|^shraddhavan|^śraddhavan/.test(joined)) {
        const firstClause = translateClause(tokens.slice(0, 3));
        const secondClause = translateClause(tokens.slice(3));
        return `${capitalizeWord(firstClause)}. ${capitalizeWord(secondClause)}.`.replace(/\.+/g, '.').replace(/\.\s*\./g, '.');
    }

    if (/^saphalam\s+bhavi[ṣs]yati/.test(joined)) {
        const tail = translateClause(tokens.slice(2));
        return `It will be fruitful; ${tail}`.replace(/^./, (char) => char.toUpperCase());
    }

    return undefined;
}

function translateClause(tokens: string[]): string {
    if (tokens.length === 0) {
        return '';
    }

    const mapped = tokens.map((token) => {
        const direct = SANSKRIT_WORD_MAP[token];
        if (direct) {
            return direct;
        }

        const guessed = guessBaseMeaning(token);
        return guessed || token;
    });

    const text = mapped.join(' ').replace(/\s+/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function guessBaseMeaning(word: string): string | undefined {
    const suffixRules: Array<[RegExp, string?]> = [
        [/ān$/, undefined],
        [/ān$/, undefined],
        [/ān$/, undefined],
        [/āya$/, undefined],
        [/aya$/, undefined],
        [/eṣu$/, undefined],
        [/ṣu$/, undefined],
        [/asya$/, undefined],
        [/ena$/, undefined],
        [/āṃ$/, undefined],
        [/am$/, undefined],
        [/ān$/, undefined],
        [/āḥ$/, undefined],
        [/ah$/, undefined],
        [/ḥ$/, undefined],
        [/aḥ$/, undefined],
        [/ṃ$/, undefined],
        [/ī$/, undefined],
        [/i$/, undefined],
        [/ū$/, undefined],
        [/u$/, undefined],
        [/o$/, undefined],
        [/e$/, undefined],
        [/a$/, undefined],
    ];

    for (const [pattern] of suffixRules) {
        if (!pattern.test(word)) {
            continue;
        }

        const stem = word.replace(pattern, '');
        if (!stem) {
            continue;
        }

        if (SANSKRIT_WORD_MAP[stem]) {
            return SANSKRIT_WORD_MAP[stem];
        }

        const withFinalA = `${stem}a`;
        if (SANSKRIT_WORD_MAP[withFinalA]) {
            return SANSKRIT_WORD_MAP[withFinalA];
        }
    }

    if (word.endsWith('m') && SANSKRIT_WORD_MAP[word.slice(0, -1)]) {
        return SANSKRIT_WORD_MAP[word.slice(0, -1)];
    }

    if (word.endsWith('s') && SANSKRIT_WORD_MAP[word.slice(0, -1)]) {
        return SANSKRIT_WORD_MAP[word.slice(0, -1)];
    }

    return undefined;
}

export function inferCustomMeaning(text: string): string {
    const cleaned = text.trim();

    if (!cleaned) {
        return 'Enter a passage to see a meaning preview.';
    }

    if (!isSanskritLike(cleaned)) {
        return formatEnglishMeaning(cleaned);
    }

    return translateSanskritLike(cleaned);
}

export async function fetchRemoteMeaning(text: string, apiBaseUrl: string): Promise<string> {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/meaning`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error(`Meaning request failed with status ${response.status}`);
    }

    const payload: { meaning?: string } = await response.json();
    const meaning = (payload.meaning || '').trim();

    if (!isProbablyEnglishMeaning(meaning)) {
        throw new Error('Model returned a non-English response');
    }

    return meaning;
}

export async function resolveCustomMeaning(text: string, apiBaseUrl: string): Promise<string> {
    try {
        const remoteMeaning = await fetchRemoteMeaning(text, apiBaseUrl);
        if (remoteMeaning) {
            return remoteMeaning;
        }
    } catch {
        // Fall back to the local heuristic preview when the model is unavailable.
    }

    return inferCustomMeaning(text);
}

function isProbablyEnglishMeaning(text: string): boolean {
    const cleaned = text.trim();
    if (!cleaned) {
        return false;
    }

    if (/[अ-हॐािीुूृॄेैोौंःऀ-ॿ]/.test(cleaned)) {
        return false;
    }

    const letters = cleaned.match(/[A-Za-z]/g)?.length ?? 0;
    const otherChars = cleaned.replace(/[A-Za-z\s.,;:!?'-]/g, '').length;
    return letters > 0 && otherChars === 0;
}