import { NextRequest, NextResponse } from 'next/server';
import * as https from 'https';
import * as http from 'http';

function fetchURL(url: string): Promise<{ content: string; contentType: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      rejectUnauthorized: false, // Allow self-signed certificates for proxy purposes
    };

    const req = protocol.request(options, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      res.on('end', () => {
        const content = Buffer.concat(chunks).toString('utf-8');
        const contentType = res.headers['content-type'] || 'text/html';
        resolve({
          content,
          contentType,
          statusCode: res.statusCode || 200,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL
    const targetUrl = new URL(url);

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are supported' },
        { status: 400 }
      );
    }

    // Fetch the content using native Node.js https/http
    const { content, contentType, statusCode } = await fetchURL(targetUrl.toString());

    if (statusCode >= 400) {
      return NextResponse.json(
        { error: `Failed to fetch: HTTP ${statusCode}` },
        { status: statusCode }
      );
    }

    let finalContent = content;

    // If HTML, rewrite URLs to absolute paths
    if (contentType.includes('text/html')) {
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;

      // Rewrite relative URLs to absolute
      finalContent = content
        .replace(/href=["'](?!http|\/\/|#|mailto:|tel:)([^"']+)["']/gi, `href="${baseUrl}/$1"`)
        .replace(/src=["'](?!http|\/\/|data:)([^"']+)["']/gi, `src="${baseUrl}/$1"`)
        .replace(/url\(["']?(?!http|\/\/|data:)([^"')]+)["']?\)/gi, `url(${baseUrl}/$1)`);

      // Add base tag for better relative URL handling
      finalContent = finalContent.replace(
        /<head>/i,
        `<head>\n  <base href="${baseUrl}/" target="_top">`
      );
    }

    // Return the proxied content without restrictive headers
    return new NextResponse(finalContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to proxy URL',
        details: 'The URL may be invalid or unreachable. Make sure the URL is accessible.'
      },
      { status: 500 }
    );
  }
}
