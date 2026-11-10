/**
 * Guru API Endpoint
 * Handles intelligent guru responses using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface GuruRequest {
  userResponse: string;
  userResponseConfidence?: number;
  isCorrect: boolean;
  pronunciationScore?: number;
  currentQuestion: string;
  currentQuestionType: 'greeting' | 'mantra' | 'translation' | 'conversation' | 'grammar';
  sessionPhase: 'test' | 'practice';
  mistakesCount?: number;
}

export interface GuruResponse {
  feedback: string;
  pronunciation?: string;
  nextAction: 'praise' | 'correct' | 'repeat' | 'next_question';
  ttsText?: string; // Text to be spoken by TTS
  suggestedCorrection?: string;
  continueSession: boolean;
}

const GURU_SYSTEM_PROMPT = `You are a wise and compassionate Sanskrit Guru teaching a Sishya (student) through an interactive voice-based learning experience. 

Your role:
- Correct pronunciation gently but clearly
- Provide immediate, actionable feedback
- Encourage the student on correct answers
- Guide the student to self-correct errors
- Adapt your teaching style based on confidence levels
- Speak in a respectful, traditional Guru manner

Response format requirements:
1. Keep feedback concise (1-2 sentences max)
2. If correcting, explain the error in simple terms
3. Always be encouraging and supportive
4. Suggest next steps clearly
5. Return responses in JSON format with required fields

Guidelines:
- For pronunciation errors: Describe what was wrong and how to fix it
- For content errors: Guide toward the correct understanding
- For "test" phase: Be more formal and evaluative
- For "practice" phase: Be more supportive and teaching-focused
- Include Sanskrit/English where helpful for clarity
`;

async function callGuruAPI(request: GuruRequest): Promise<GuruResponse> {
  const userMessage = formatGuruPrompt(request);

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 300,
    system: GURU_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse the JSON response from Claude
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error parsing Claude response:', error);
  }

  // Fallback response
  return {
    feedback: responseText || 'Continue with your learning journey.',
    nextAction: request.isCorrect ? 'praise' : 'correct',
    continueSession: true,
    ttsText: responseText || 'Excellent. Let us continue.',
  };
}

function formatGuruPrompt(request: GuruRequest): string {
  const confidenceLevel =
    request.userResponseConfidence && request.userResponseConfidence > 80 ? 'High' : 'Low';

  return `
Sishya (Student) Learning Session:

Question Category: ${request.currentQuestionType}
Question Asked: "${request.currentQuestion}"
Student's Response: "${request.userResponse}"
Response Confidence: ${confidenceLevel} (${request.userResponseConfidence?.toFixed(0) || 'N/A'}%)
Is Response Correct: ${request.isCorrect ? 'Yes' : 'No'}
Pronunciation Score: ${request.pronunciationScore || 'N/A'}/100
Learning Phase: ${request.sessionPhase === 'test' ? 'Test Yourself (Evaluative)' : 'Practice Mode (Supportive)'}
Previous Mistakes: ${request.mistakesCount || 0}

Based on this interaction, provide a Guru response in the following JSON format:
{
  "feedback": "Your feedback here (max 2 sentences)",
  "pronunciation": "If pronunciation needs correction, describe the issue",
  "nextAction": "praise|correct|repeat|next_question",
  "ttsText": "The exact text for Text-To-Speech output",
  "suggestedCorrection": "If applicable, suggest the correct response",
  "continueSession": true/false
}

Respond ONLY with the JSON object, no other text.
`;
}

/**
 * POST /api/guru
 * Handle guru interactions
 */
export async function POST(request: Request) {
  try {
    const body: GuruRequest = await request.json();

    // Validate required fields
    if (!body.userResponse || !body.currentQuestion) {
      return Response.json(
        { error: 'Missing required fields: userResponse, currentQuestion' },
        { status: 400 }
      );
    }

    // Call Guru API with Claude
    const guruResponse = await callGuruAPI(body);

    return Response.json(guruResponse);
  } catch (error: any) {
    console.error('Guru API error:', error);
    return Response.json(
      { 
        error: 'Failed to process guru request',
        details: error.message,
        feedback: 'Let us continue with your learning.',
        continueSession: true,
        nextAction: 'repeat',
      },
      { status: 500 }
    );
  }
}

/**
 * Alternative: Simulated guru responses for testing (no API calls)
 */
export function getSimulatedGuruResponse(request: GuruRequest): GuruResponse {
  if (request.isCorrect) {
    const praiseMessages: GuruResponse[] = [
      {
        feedback: 'Excellent! Your pronunciation is clear and accurate.',
        nextAction: 'praise',
        ttsText: 'Wonderful! You have learned well. Let us move to the next question.',
        continueSession: true,
      },
      {
        feedback: 'Very good! You understand this well.',
        nextAction: 'praise',
        ttsText: 'Correct! Your dedication is commendable. Shall we continue?',
        continueSession: true,
      },
      {
        feedback: 'सुन्दरम्! Your comprehension is deep.',
        nextAction: 'praise',
        ttsText: 'Beautiful! You are progressing nicely.',
        continueSession: true,
      },
    ];
    return praiseMessages[Math.floor(Math.random() * praiseMessages.length)];
  } else {
    const correctionMessages: GuruResponse[] = [
      {
        feedback: 'Let me guide you. Listen carefully to the correct pronunciation.',
        nextAction: 'correct',
        ttsText: 'Not quite right. Listen to how it should sound.',
        suggestedCorrection: 'Pay attention to the syllable stress and vowel length.',
        continueSession: true,
      },
      {
        feedback: 'This is a common mistake. Try again with more focus.',
        nextAction: 'repeat',
        ttsText: 'Remember, in Sanskrit, each syllable carries importance.',
        suggestedCorrection: 'Pronounce each syllable distinctly.',
        continueSession: true,
      },
      {
        feedback: 'जरा धीरें। Slow down and articulate each sound clearly.',
        nextAction: 'repeat',
        ttsText: 'Once more, but with more patience and clarity.',
        suggestedCorrection: 'Break it into syllables: this helps with accuracy.',
        continueSession: true,
      },
    ];
    return correctionMessages[Math.floor(Math.random() * correctionMessages.length)];
  }
}
