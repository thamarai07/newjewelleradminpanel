// app/api/upload/articles/route.js
import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { mkdir } from 'fs/promises';

// Define upload directory outside of the Next.js build process
const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create articles-specific directory
    const uploadDir = path.join(UPLOADS_ROOT, 'articles');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
      console.log('Directory creation info:', error.message);
    }

    // Create unique filename with original extension
    const uniqueFilename = `${uuidv4()}${path.extname(file.name)}`;
    const uploadPath = path.join(uploadDir, uniqueFilename);

    // Write the file
    await writeFile(uploadPath, buffer);
    
    // Return the public URL with BASE_URL
    const fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/media/articles/${uniqueFilename}`;
    
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error uploading file', details: error.message },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};