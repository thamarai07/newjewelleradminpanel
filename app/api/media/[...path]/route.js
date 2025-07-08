// app/api/media/[...path]/route.js
import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync } from 'fs';

// Define uploads directory outside of Next.js build process
const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export async function GET(request, { params }) {
  try {
    const requestPath = params.path || [];
    
    if (requestPath.length < 2) {
      return NextResponse.json(
        { error: 'Invalid media path' },
        { status: 400 }
      );
    }

    // Extract type (articles, categories) and filename
    const type = requestPath[0];
    const filename = requestPath[1];
    
    // Validate the path to prevent directory traversal
    const filePath = path.join(UPLOADS_ROOT, type, filename);
    const normalizedPath = path.normalize(filePath);
    
    // Security check to ensure we don't access files outside uploads directory
    if (!normalizedPath.startsWith(UPLOADS_ROOT)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Check if file exists
    if (!existsSync(normalizedPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read and return the file with appropriate content type
    const file = await readFile(normalizedPath);
    const contentType = getContentType(filename);
    
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Media serving error:', error);
    return NextResponse.json(
      { error: 'Error serving media file' },
      { status: 500 }
    );
  }
}

// Helper function to determine content type based on file extension
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}