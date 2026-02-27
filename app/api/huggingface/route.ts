import { NextRequest, NextResponse } from 'next/server';

const HF_TOKEN = process.env.HF_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'list') {
      const task = searchParams.get('task') || 'text-generation';
      const sort = searchParams.get('sort') || 'downloads';
      const direction = searchParams.get('direction') || '-1'; // -1 = desc, 1 = asc
      const limit = searchParams.get('limit') || '50';

      // Build URL with proper query params
      const params = new URLSearchParams({
        task: task,
        sort: sort,
        direction: direction === '-1' ? 'desc' : 'asc',
        limit: limit,
        full: 'true', // Get full model info
      });

      const hfUrl = `https://huggingface.co/api/models?${params.toString()}`;

      const response = await fetch(hfUrl, {
        headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {},
      });

      if (!response.ok) {
        console.error(`HF API error: ${response.status}`);
        return NextResponse.json(
          { error: `HuggingFace API error: ${response.statusText}` },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Shape the response with enhanced metadata
      const models = Array.isArray(data)
        ? data.map((model: any) => ({
            id: model.id,
            name: model.id.split('/')[1] || model.id,
            author: model.author || model.id.split('/')[0],
            task: model.task,
            downloads: model.downloads || 0,
            likes: model.likes || 0,
            tags: model.tags || [],
            description: model.description || '',
            private: model.private || false,
            modelId: model.id,
            lastModified: model.lastModified,
          }))
        : [];

      return NextResponse.json({ models, count: models.length });
    }

    if (action === 'model') {
      const modelId = searchParams.get('modelId');
      if (!modelId) {
        return NextResponse.json(
          { error: 'modelId is required' },
          { status: 400 }
        );
      }

      const hfUrl = `https://huggingface.co/api/models/${modelId}`;
      const response = await fetch(hfUrl, {
        headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {},
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Model not found or API error: ${response.statusText}` },
          { status: response.status }
        );
      }

      const model = await response.json();

      return NextResponse.json({
        id: model.id,
        name: model.id.split('/')[1] || model.id,
        author: model.author || model.id.split('/')[0],
        task: model.task,
        downloads: model.downloads || 0,
        likes: model.likes || 0,
        tags: model.tags || [],
        description: model.description || '',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "list" or "model"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('HuggingFace API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch from HuggingFace' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!HF_TOKEN) {
      return NextResponse.json(
        { error: 'HF_TOKEN environment variable not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { modelId, inputs, parameters } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      );
    }

    const hfUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    const response = await fetch(hfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: inputs || '',
        parameters: parameters || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('HF Inference error:', data);
      return NextResponse.json(
        { error: data.error || 'HuggingFace Inference API error' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      reply: data,
      model: modelId,
      raw: data,
    });
  } catch (error: any) {
    console.error('HuggingFace POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process HuggingFace request' },
      { status: 500 }
    );
  }
}
