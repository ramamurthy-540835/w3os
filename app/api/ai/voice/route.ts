import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Speech-to-Text using Gemini's multimodal API
 * Transcribes audio to text
 */
async function speechToText(audioBase64: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'audio/webm',
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe this audio exactly. Return ONLY the transcription, nothing else.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        },
      }),
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Speech-to-text failed');
  }

  const transcription =
    data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return transcription.trim();
}

/**
 * Get AI response for transcribed text using Gemini API directly
 */
async function getAiResponse(
  text: string,
  history: any[] = []
): Promise<{ reply: string; usage: any }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const contents = [
    ...history.map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.95,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to get AI response');
  }

  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';

  return {
    reply,
    usage: data.usageMetadata || {},
  };
}

/**
 * POST endpoint for voice operations
 * Handles: speech-to-text, text-to-speech
 */
export async function POST(req: NextRequest) {
  try {
    const { action, audioBase64, text, history } = await req.json();

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    if (action === 'speech-to-text') {
      if (!audioBase64) {
        return NextResponse.json(
          { error: 'audioBase64 is required for speech-to-text' },
          { status: 400 }
        );
      }

      const transcription = await speechToText(audioBase64);

      return NextResponse.json({
        action: 'speech-to-text',
        transcription,
        success: true,
      });
    }

    if (action === 'speech-to-text-with-response') {
      if (!audioBase64) {
        return NextResponse.json(
          { error: 'audioBase64 is required' },
          { status: 400 }
        );
      }

      // Transcribe audio
      const transcription = await speechToText(audioBase64);

      // Get AI response
      const { reply, usage } = await getAiResponse(transcription, history);

      return NextResponse.json({
        action: 'speech-to-text-with-response',
        transcription,
        reply,
        usage,
        success: true,
      });
    }

    if (action === 'text-to-speech') {
      if (!text) {
        return NextResponse.json(
          { error: 'text is required for text-to-speech' },
          { status: 400 }
        );
      }

      // Text-to-speech is handled on the client-side using Web Speech API
      // This endpoint just returns the text for the client to speak
      return NextResponse.json({
        action: 'text-to-speech',
        text,
        method: 'client-side',
        note: 'Use Web Speech API (speechSynthesis) on the client',
        success: true,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Voice API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Voice processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for voice service status
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    model: GEMINI_MODEL,
    features: ['speech-to-text', 'text-to-speech', 'speech-to-text-with-response'],
    hasApiKey: !!GEMINI_API_KEY,
  });
}
