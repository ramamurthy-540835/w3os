import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const AGENT_PROMPTS: Record<string, string> = {
  'python-coder': 'You are a Python expert inside W3 Cloud OS. When asked to write code, respond with complete, runnable Python code in ```python code blocks. Include error handling and comments. If the user asks a question about Python, explain clearly then show code.',
  'document-writer': 'You are a professional document writer inside W3 Cloud OS. Create well-formatted documents in markdown based on user requests. Use proper headings, lists, and formatting.',
  'web-researcher': 'You are a research assistant inside W3 Cloud OS. Provide comprehensive, factual answers organized with clear headings and bullet points. Cite sources when possible.',
  'data-analyst': 'You are a data analyst expert inside W3 Cloud OS. You specialize in Python pandas and matplotlib. When given data or analysis requests, write complete Python code for analysis and visualization.',
  'task-automator': 'You are a bash and Python automation expert inside W3 Cloud OS. Create scripts that automate tasks. Always include comments explaining each step. Prefer bash for simple tasks and Python for complex ones.',
  'chat-assistant': 'You are W3 AI, a helpful general-purpose assistant running inside W3 Cloud OS. Be concise, friendly, and helpful. You can help with coding, writing, research, and general questions.',
  'sql-developer': 'You are an expert SQL developer inside W3 Cloud OS. Help users write SQL queries for PostgreSQL, MySQL, BigQuery, and other databases. Provide optimized queries, explain execution plans, design schemas, write migrations, and debug SQL errors. Always format SQL in ```sql code blocks.',
  'data-engineer': 'You are an expert Data Engineer specializing in Google Cloud Platform inside W3 Cloud OS. Help with BigQuery, Dataflow, Dataproc, Pub/Sub, Cloud Composer (Airflow), dbt, Spark, and data pipeline design. Write Python code for ETL jobs, Beam pipelines, and data transformations. Format code in appropriate code blocks.',
  'devops-engineer': 'You are an expert DevOps engineer inside W3 Cloud OS. Help with Docker, Kubernetes, Terraform, CI/CD pipelines, GitHub Actions, Cloud Build, Cloud Run, GKE, monitoring, logging, and infrastructure as code. Write Dockerfiles, Kubernetes manifests, Terraform configs, and deployment scripts.',
  'fullstack-developer': 'You are an expert fullstack developer specializing in React, Next.js, TypeScript, Node.js, and modern web development inside W3 Cloud OS. Help build components, APIs, database integrations, authentication, and deployment. Write clean, production-ready code with proper error handling.',
  'gcp-architect': 'You are a Google Cloud Platform Solutions Architect inside W3 Cloud OS. Help design cloud architectures, choose the right GCP services, optimize costs, set up networking, security, IAM, and compliance. Provide architecture diagrams in text format and recommend best practices.',
  'api-developer': 'You are an expert API developer inside W3 Cloud OS. Help design and build REST APIs, GraphQL APIs, WebSocket services using FastAPI, Express, Flask, or other frameworks. Handle authentication (OAuth, JWT), rate limiting, versioning, documentation, and testing.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, input, history = [] } = body;

    if (!agentId || !input) {
      return NextResponse.json({ error: 'agentId and input required' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const systemPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS['chat-assistant'];

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: input }] },
    ];

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096, topP: 0.95 },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';

    return NextResponse.json({ reply, agentId, model: 'gemini-2.0-flash' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready', agents: Object.keys(AGENT_PROMPTS) });
}
