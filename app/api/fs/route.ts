import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Use Application Default Credentials - Cloud Run uses the compute service account
const storage = new Storage();
const BUCKET = process.env.GCS_BUCKET || 'w3-os';

// Get user email from headers (from auth middleware)
function getUserEmail(req: NextRequest): string {
  const email = req.headers.get('x-user-email') || 'default@example.com';
  return email;
}

// Convert email to safe path format
function sanitizeEmail(email: string): string {
  return email.replace(/[@.]/g, '_');
}

// Get user's base path in bucket
function getUserPath(userEmail: string): string {
  return `users/${sanitizeEmail(userEmail)}/`;
}

// Initialize user folders on first access
async function initUserFolders(userEmail: string) {
  const basePath = getUserPath(userEmail);
  const folders = ['home/', 'Documents/', 'Downloads/', 'Desktop/', 'Pictures/', '.config/'];

  try {
    for (const folder of folders) {
      const file = storage.bucket(BUCKET).file(`${basePath}${folder}.keep`);
      const [exists] = await file.exists();
      if (!exists) {
        await file.save('');
      }
    }
  } catch (error) {
    console.error('Error initializing user folders:', error);
  }
}

// List directory contents
async function listDirectory(userEmail: string, path: string) {
  const basePath = getUserPath(userEmail);
  const fullPath = path === '/' ? basePath : `${basePath}${path.replace(/^\//, '')}/`;

  const [files] = await storage.bucket(BUCKET).getFiles({
    prefix: fullPath,
    delimiter: '/',
  });

  const [dirs] = await storage.bucket(BUCKET).getFiles({
    prefix: fullPath,
  });

  // Get unique directory names
  const dirSet = new Set<string>();
  dirs.forEach((file) => {
    const name = file.name.replace(fullPath, '');
    if (name && name.includes('/') && name !== '.keep') {
      const dirName = name.split('/')[0];
      dirSet.add(dirName);
    }
  });

  // Build items list
  const items: any[] = [];

  // Add directories
  dirSet.forEach((dirName) => {
    items.push({
      name: dirName,
      path: `/${path === '/' ? '' : path.replace(/^\//, '')}${dirName}`.replace(/\/+/g, '/'),
      type: 'directory',
      size: 0,
      modified: new Date().toISOString(),
    });
  });

  // Add files (exclude .keep files)
  files.forEach((file) => {
    const name = file.name.split('/').filter(Boolean).pop();
    if (name && name !== '.keep') {
      const filePath = file.name.replace(basePath, '/').replace(/\/$/, '');
      const fileSize = typeof file.metadata.size === 'string'
        ? parseInt(file.metadata.size, 10)
        : (file.metadata.size || 0);
      items.push({
        name,
        path: filePath,
        type: 'file',
        size: fileSize,
        modified: file.metadata.updated,
      });
    }
  });

  return items.sort((a, b) => {
    // Directories first, then by name
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

// Read file content
async function readFile(userEmail: string, path: string) {
  const basePath = getUserPath(userEmail);
  const fullPath = `${basePath}${path.replace(/^\//, '')}`;

  const [content] = await storage.bucket(BUCKET).file(fullPath).download();
  return content.toString('utf-8');
}

// Write file content
async function writeFile(userEmail: string, path: string, content: string) {
  const basePath = getUserPath(userEmail);
  const fullPath = `${basePath}${path.replace(/^\//, '')}`;

  await storage.bucket(BUCKET).file(fullPath).save(content || '');
}

// Create directory
async function createDirectory(userEmail: string, path: string) {
  const basePath = getUserPath(userEmail);
  const fullPath = `${basePath}${path.replace(/^\//, '')}/`;

  await storage.bucket(BUCKET).file(`${fullPath}.keep`).save('');
}

// Delete file or directory
async function deleteFile(userEmail: string, path: string) {
  const basePath = getUserPath(userEmail);
  const fullPath = `${basePath}${path.replace(/^\//, '')}`;

  const bucket = storage.bucket(BUCKET);
  const [files] = await bucket.getFiles({ prefix: fullPath });

  for (const file of files) {
    await file.delete();
  }
}

// Rename file
async function renameFile(
  userEmail: string,
  oldPath: string,
  newPath: string
) {
  const basePath = getUserPath(userEmail);
  const oldFullPath = `${basePath}${oldPath.replace(/^\//, '')}`;
  const newFullPath = `${basePath}${newPath.replace(/^\//, '')}`;

  const bucket = storage.bucket(BUCKET);
  const oldFile = bucket.file(oldFullPath);

  // Copy to new location
  await oldFile.copy(newFullPath);

  // Delete old file
  await oldFile.delete();
}

// Upload file (base64 or binary)
async function uploadFile(userEmail: string, path: string, content: Buffer) {
  const basePath = getUserPath(userEmail);
  const fullPath = `${basePath}${path.replace(/^\//, '')}`;

  await storage.bucket(BUCKET).file(fullPath).save(content);
}

// GET: List directory or read file
export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get('path') || '/home';
    const userEmail = getUserEmail(req);

    // Initialize user folders on first access
    await initUserFolders(userEmail);

    // Check if path is a file or directory
    const basePath = getUserPath(userEmail);
    const fullPath = `${basePath}${path.replace(/^\//, '')}`;

    const bucket = storage.bucket(BUCKET);
    const file = bucket.file(fullPath);
    const [fileExists] = await file.exists();

    if (fileExists) {
      // It's a file, return content
      const content = await readFile(userEmail, path);
      return NextResponse.json({
        type: 'file',
        path,
        content,
      });
    } else {
      // It's a directory, list contents
      const items = await listDirectory(userEmail, path);
      return NextResponse.json({
        type: 'directory',
        path,
        items,
      });
    }
  } catch (error: any) {
    console.error('FS GET Error:', error.message || error);
    // Fallback to mock folders if Cloud Storage fails
    const mockFolders = ['Documents', 'Downloads', 'Desktop', 'Pictures'];
    const path = req.nextUrl.searchParams.get('path') || '/';

    // Always return mock folders on error
    return NextResponse.json({
      type: 'directory',
      path: path === '/home' ? '/' : path,
      items: mockFolders.map(name => ({
        name,
        path: `/${name}`,
        type: 'directory',
        size: 0,
        modified: new Date().toISOString(),
      })),
    });
  }
}

// POST: Create, write, delete, rename
export async function POST(req: NextRequest) {
  try {
    const { action, path, content, newPath } = await req.json();
    const userEmail = getUserEmail(req);

    if (!action || !path) {
      return NextResponse.json(
        { error: 'action and path are required' },
        { status: 400 }
      );
    }

    // Initialize user folders
    await initUserFolders(userEmail);

    switch (action) {
      case 'init': {
        await initUserFolders(userEmail);
        return NextResponse.json({
          success: true,
          message: 'User folders initialized',
        });
      }

      case 'read': {
        const content = await readFile(userEmail, path);
        return NextResponse.json({ content });
      }

      case 'write': {
        await writeFile(userEmail, path, content || '');
        return NextResponse.json({ success: true });
      }

      case 'mkdir': {
        await createDirectory(userEmail, path);
        return NextResponse.json({ success: true });
      }

      case 'delete': {
        await deleteFile(userEmail, path);
        return NextResponse.json({ success: true });
      }

      case 'rename': {
        if (!newPath) {
          return NextResponse.json(
            { error: 'newPath is required for rename' },
            { status: 400 }
          );
        }
        await renameFile(userEmail, path, newPath);
        return NextResponse.json({ success: true });
      }

      case 'upload': {
        if (!content) {
          return NextResponse.json(
            { error: 'content is required for upload' },
            { status: 400 }
          );
        }
        // Content should be base64 encoded
        const buffer = Buffer.from(content, 'base64');
        await uploadFile(userEmail, path, buffer);
        return NextResponse.json({ success: true });
      }

      default: {
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
      }
    }
  } catch (error: any) {
    console.error('FS POST Error:', error);
    const errorMessage = error.message || 'Failed to process request';

    // Check for permission errors and provide helpful message
    if (errorMessage.includes('permission') || errorMessage.includes('Permission denied')) {
      return NextResponse.json(
        { error: 'Storage permission denied. Please check GCS bucket permissions for your service account.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
