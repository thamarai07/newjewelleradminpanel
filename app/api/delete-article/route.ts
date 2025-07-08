import { NextResponse } from "next/server";
import { db } from "../../../lib/firebaseAdmin"; // Adjust the relative path as needed
import admin from "firebase-admin";

export async function DELETE(request) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: "Missing article id" },
        { status: 400 }
      );
    }

    // Retrieve the article document to get image info if available
    const articleRef = db.collection("articles").doc(articleId);
    const articleDoc = await articleRef.get();

    if (!articleDoc.exists) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const articleData = articleDoc.data();

    // Delete the article document
    await articleRef.delete();

    // Remove the article from users' favorites (savedArticleIds array)
    const usersSnapshot = await db.collection("users").get();
    const batch = db.batch();

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.savedArticleIds && userData.savedArticleIds.includes(articleId)) {
        const userRef = db.collection("users").doc(userDoc.id);
        batch.update(userRef, {
          savedArticleIds: admin.firestore.FieldValue.arrayRemove(articleId),
        });
      }
    });
    await batch.commit();

    return NextResponse.json(
      { message: "Article and related data deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to extract the image file path from a Firebase Storage URL if necessary.
function extractImagePath(imageUrl) {
  try {
    const url = new URL(imageUrl);
    // For Firebase Storage URLs, the file path might be in the "name" query parameter.
    return url.searchParams.get("name") || null;
  } catch (err) {
    return null;
  }
}
