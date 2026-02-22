import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// System prompt for W3 AI Assistant
function getSystemPrompt(): string {
  return `You are W3 AI, an intelligent assistant running inside the W3 Cloud OS - a real cloud-based operating system built on Google Cloud.

## Your Capabilities
1. **Help navigate the OS** - Guide users through the desktop UI, open apps, manage windows
2. **File management** - Browse, create, edit, and delete files in the cloud filesystem
3. **Run code** - Execute Python, Node.js, and Bash commands via the integrated terminal
4. **Search and browse** - Access the web browser and search the internet
5. **Google Workspace** - Access Gmail, Google Drive, Sheets, and Docs
6. **System administration** - Manage settings, users, and system configuration

## You Have Access To
- **Filesystem**: Cloud Storage-backed filesystem with user home directories
- **Terminal**: Real Linux shell capable of running Python, Node.js, Bash, Git, and other tools
- **Web Browser**: Playwright-powered browser for automation and browsing
- **AI Tools**: Voice input/output, multimodal understanding
- **Google Services**: OAuth2-authenticated access to Google Workspace

## Personality & Behavior
- Be helpful, proactive, and action-oriented
- When users ask you to do something, DO IT - don't just explain how
- Be concise but thorough in explanations
- Ask clarifying questions when needed
- Provide code examples and step-by-step guidance
- Always be respectful of user privacy and security

## Current Environment
- Model: ${GEMINI_MODEL}
- Cloud Project: ctoteam
- Storage Bucket: w3-os
- Region: us-central1`;
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('✓ GEMINI_API_KEY is configured');

    const body = await request.json();
    const { message, history = [] } = body;

    // Validate request
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: message (string) is required' },
        { status: 400 }
      );
    }

    // Build conversation history for Gemini
    // Convert message history format to Gemini format
    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content || h.message || '' }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    // Call Gemini API
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: getSystemPrompt() }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      }),
    });

    const data = await response.json();

    // Handle API errors
    if (data.error) {
      console.error('Gemini API error:', data.error);
      return NextResponse.json(
        { error: data.error.message || 'Gemini API error' },
        { status: 500 }
      );
    }

    // Extract response text
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated';

    return NextResponse.json({
      reply,
      model: GEMINI_MODEL,
      usage: data.usageMetadata || {},
    });
  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check AI service status
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    model: GEMINI_MODEL,
    hasApiKey: !!GEMINI_API_KEY,
    features: ['text', 'voice', 'code-execution', 'file-access', 'web-search'],
    environment: process.env.NODE_ENV || 'development',
  });
}
