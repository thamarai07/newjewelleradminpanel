// app/api/notifications/route.js
import { NextResponse } from 'next/server';
import { sendNewArticleNotification } from '../../../lib/notificationService';
import { db } from '../../../lib/firebaseAdmin';

/**
 * API route to send notifications about new articles
 */
export async function POST(req) {
  try {
    const { articleId, title, categories, locations, imageUrl } = await req.json();

    // Validate required fields
    if (!articleId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields. articleId and title are required.' },
        { status: 400 }
      );
    }

    // If article ID is provided but no title/categories, fetch the article data
    let finalTitle = title;
    let finalCategories = categories || [];
    let finalLocations = locations || [];
    let finalImageUrl = imageUrl;

    // If we need to fetch the full article data
    if (!finalTitle || finalCategories.length === 0) {
      const articleSnapshot = await db.collection('articles').doc(articleId).get();

      if (!articleSnapshot.exists) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        );
      }

      const articleData = articleSnapshot.data();

      if (!finalTitle) {
        finalTitle = articleData.title || 'New Article';
      }

      if (finalCategories.length === 0) {
        // Use categories array if available, otherwise use single category
        if (articleData.categories && Array.isArray(articleData.categories)) {
          finalCategories = articleData.categories;
        } else if (articleData.category) {
          finalCategories = [articleData.category];
        }
      }
      
      if (finalLocations.length === 0 && articleData.locations) {
        finalLocations = Array.isArray(articleData.locations) 
          ? articleData.locations 
          : articleData.location ? [articleData.location] : [];
      }

      if (!finalImageUrl) {
        finalImageUrl = articleData.imageUrl;
      }
    }

    // Send push notification
    const result = await sendNewArticleNotification(
      articleId,
      finalTitle,
      finalCategories,
      finalLocations,
      finalImageUrl
    );

    // The result will now have success=true even when we successfully send the notification
    return NextResponse.json({
      success: result.success,
      message: result.message,
      tokensCount: result.tokensCount,
      details: result.details
    });
    
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}