import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Use Application Default Credentials
const storage = new Storage();
const BUCKET = process.env.GCS_BUCKET || 'w3-os';

// Get user email from headers
function getUserEmail(req: NextRequest): string {
  return req.headers.get('x-user-email') || 'default@example.com';
}

// Sanitize email for path safety
function sanitizeEmail(email: string): string {
  return email.replace(/[@.]/g, '_');
}

// List all agents (built-in + user-created)
export async function GET(req: NextRequest) {
  try {
    const userEmail = getUserEmail(req);
    const builtInAgents = [
      {
        id: 'python-coder',
        name: 'Python Coder',
        description: 'Write and run Python code',
        icon: '🐍',
        category: 'Coding',
        isBuiltIn: true,
      },
      {
        id: 'document-writer',
        name: 'Document Writer',
        description: 'Create professional documents',
        icon: '📝',
        category: 'Writing',
        isBuiltIn: true,
      },
      {
        id: 'web-researcher',
        name: 'Web Researcher',
        description: 'Research and compile findings',
        icon: '🔍',
        category: 'Research',
        isBuiltIn: true,
      },
      {
        id: 'data-analyst',
        name: 'Data Analyst',
        description: 'Analyze data with Python',
        icon: '📊',
        category: 'Data',
        isBuiltIn: true,
      },
      {
        id: 'task-automator',
        name: 'Task Automator',
        description: 'Create automation scripts',
        icon: '🔄',
        category: 'Automation',
        isBuiltIn: true,
      },
    ];

    // Try to load user-created agents from Cloud Storage
    const userPath = `users/${sanitizeEmail(userEmail)}/`;
    let customAgents = [];

    try {
      const [files] = await storage.bucket(BUCKET).getFiles({
        prefix: `${userPath}agents/`,
      });

      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const [content] = await file.download();
          customAgents.push(JSON.parse(content.toString()));
        }
      }
    } catch (error) {
      console.log('Could not load custom agents from Cloud Storage');
    }

    return NextResponse.json({
      agents: [...builtInAgents, ...customAgents],
    });
  } catch (error: any) {
    console.error('Agents GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list agents' },
      { status: 500 }
    );
  }
}

// Run an agent (call AI with agent-specific prompt)
export async function POST(req: NextRequest) {
  try {
    const { agentId, input } = await req.json();

    if (!agentId || !input) {
      return NextResponse.json(
        { error: 'agentId and input are required' },
        { status: 400 }
      );
    }

    // Get system prompts for agents
    const agentPrompts: Record<string, string> = {
      'python-coder': 'You are a Python coding assistant. When the user describes what they want, write complete, runnable Python code. Always include error handling. Format code in ```python blocks.',
      'document-writer': 'You are a professional document writer. Create well-structured documents in markdown format based on user requests.',
      'web-researcher': 'You are a research assistant. When given a topic, provide comprehensive information and compile findings into a markdown report.',
      'data-analyst': 'You are a data analyst. Analyze data using Python with pandas. Write code that processes the data and creates visualizations.',
      'task-automator': 'You are a task automation expert. Create bash or Python scripts to automate tasks. Include comments explaining each step.',
    };

    const systemPrompt = agentPrompts[agentId] || 'You are a helpful AI assistant.';

    // Call Gemini API with agent prompt
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          { role: 'user', parts: [{ text: input }] },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || `Gemini API error: ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    return NextResponse.json({
      agentId,
      response: responseText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agents POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run agent' },
      { status: 500 }
    );
  }
}

// Create custom agent
export async function PUT(req: NextRequest) {
  try {
    const userEmail = getUserEmail(req);
    const { name, description, icon, category, systemPrompt } = await req.json();

    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: 'name and systemPrompt are required' },
        { status: 400 }
      );
    }

    const agentId = name.toLowerCase().replace(/\s+/g, '-');
    const agent = {
      id: agentId,
      name,
      description,
      icon,
      category,
      systemPrompt,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };

    // Save to Cloud Storage
    const userPath = `users/${sanitizeEmail(userEmail)}/`;
    const bucket = storage.bucket(BUCKET);
    const file = bucket.file(`${userPath}agents/${agentId}.json`);

    await file.save(JSON.stringify(agent, null, 2));

    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    console.error('Agents PUT Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}

// Delete custom agent
export async function DELETE(req: NextRequest) {
  try {
    const userEmail = getUserEmail(req);
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    const userPath = `users/${sanitizeEmail(userEmail)}/`;
    const bucket = storage.bucket(BUCKET);
    const file = bucket.file(`${userPath}agents/${agentId}.json`);

    await file.delete();

    return NextResponse.json({
      success: true,
      message: `Agent ${agentId} deleted`,
    });
  } catch (error: any) {
    console.error('Agents DELETE Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
