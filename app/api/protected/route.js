// app/api/protected/route.js
import { auth } from '../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const token = authHeader?.split(' ')[1]; // Extract token from 'Bearer <token>'

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized. No token provided.' },
        { status: 401 }
      );
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(token);

    // Check for admin claims
    if (decodedToken.admin !== true) {
      return NextResponse.json(
        { error: 'Forbidden. Admin privileges required.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: 'Welcome, admin!' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized. Token verification failed.' },
      { status: 401 }
    );
  }
}

// Block other methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}