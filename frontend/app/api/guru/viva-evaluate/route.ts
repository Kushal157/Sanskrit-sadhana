/**
 * Viva Evaluation API Endpoint
 * Handles Viva mode pronunciation evaluation
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

export interface VivaEvaluateRequest {
  shloka_text: string;
  audio_base64: string;
}

export interface VivaEvaluateResponse {
  guru_verdict: string;
  mispronounced_word: string;
  timestamps: [number, number];
  score: number;
  detailed_errors: any[];
  hypothesis_text?: string;
  reference_text?: string;
}

/**
 * POST /api/guru/viva-evaluate
 * Forward audio to backend for pronunciation evaluation
 */
export async function POST(request: Request) {
  try {
    const body: VivaEvaluateRequest = await request.json();

    // Validate required fields
    if (!body.shloka_text || !body.audio_base64) {
      return Response.json(
        { error: "Missing required fields: shloka_text, audio_base64" },
        { status: 400 }
      );
    }

    // Forward request to Python backend
    const backendResponse = await fetch(`${BACKEND_URL}/viva-evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shloka_text: body.shloka_text,
        audio_base64: body.audio_base64,
      }),
    });

    if (!backendResponse.ok) {
      console.error("Backend error:", backendResponse.statusText);
      return Response.json(
        {
          guru_verdict:
            "I apologize, Shishya. There was an issue with the evaluation. Please try again.",
          mispronounced_word: "error",
          timestamps: [0, 0],
          score: 0,
          detailed_errors: [],
        },
        { status: 200 } // Return 200 even with error to avoid frontend issues
      );
    }

    const data: VivaEvaluateResponse = await backendResponse.json();

    return Response.json(data);
  } catch (error: any) {
    console.error("Viva evaluate API error:", error);
    return Response.json(
      {
        guru_verdict:
          "Shishya, let us try again. Please ensure your microphone is working properly.",
        mispronounced_word: "error",
        timestamps: [0, 0],
        score: 0,
        detailed_errors: [],
      },
      { status: 200 } // Return 200 even with error to avoid frontend issues
    );
  }
}
