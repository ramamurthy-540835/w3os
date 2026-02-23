import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedMimes = [
      'text/csv',
      'application/json',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/x-python',
      'text/x-sql',
    ];

    if (!allowedMimes.includes(file.type) && !file.name.match(/\.(csv|json|txt|xlsx|py|sql)$/i)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = '/tmp/w3-workspace/uploads';
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file with safe filename
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filepath = join(uploadDir, safeFilename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Read first 20 rows for CSV preview
    let preview = '';
    if (file.type === 'text/csv' || safeFilename.endsWith('.csv')) {
      const content = Buffer.from(bytes).toString('utf-8');
      const lines = content.split('\n').slice(0, 20);
      preview = lines.join('\n');
    }

    return NextResponse.json({
      success: true,
      path: filepath,
      filename: safeFilename,
      size: file.size,
      type: file.type,
      preview,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
