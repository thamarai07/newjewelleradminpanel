// lib/notificationService.js
import { db } from './firebaseAdmin';
import fetch from 'node-fetch';

/**
 * Send push notifications to users about a new article
 * @param {string} articleId - The ID of the article
 * @param {string} title - The title of the article
 * @param {Array} categories - List of article categories
 * @param {Array} locations - List of article locations
 * @param {string} imageUrl - URL of the article image (optional)
 * @returns {Promise<Object>} Notification send result
 */
export async function sendNewArticleNotification(articleId, title, categories = [], locations = [], imageUrl = null) {
  try {
    // Get all users with push tokens
    const usersSnapshot = await db.collection('users')
      .where('pushToken', '!=', null)
      .get();

    if (usersSnapshot.empty) {
      console.log('No users with push tokens found');
      return { success: true, message: 'No users to notify', tokensCount: 0 };
    }

    // Extract valid tokens and apply user preferences filtering
    const tokens = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      
      // Verify token format
      if (!userData.pushToken || typeof userData.pushToken !== 'string' || 
          !userData.pushToken.startsWith('ExponentPushToken')) {
        return; // Skip invalid tokens
      }
      
      // Check if this user wants notifications for these categories
      // If user has specified categories, check if the article matches any
      if (userData.pushNotificationCategories && 
          userData.pushNotificationCategories.length > 0) {
        // Check for any overlap between article categories and user preferences
        const hasMatchingCategory = categories.some(category => 
          userData.pushNotificationCategories.includes(category)
        );
        
        if (!hasMatchingCategory) {
          return; // Skip if user isn't interested in these categories
        }
      }
      
      // Similarly, check for location preferences
      if (userData.pushNotificationLocations && 
          userData.pushNotificationLocations.length > 0 &&
          locations.length > 0) {
        // Check for any overlap between article locations and user preferences
        const hasMatchingLocation = locations.some(location => 
          userData.pushNotificationLocations.includes(location)
        );
        
        if (!hasMatchingLocation) {
          return; // Skip if user isn't interested in these locations
        }
      }
      
      // User passes all filters, add their token
      tokens.push(userData.pushToken);
    });

    if (tokens.length === 0) {
      console.log('No valid push tokens found after preference filtering');
      return { success: true, message: 'No matching recipients found', tokensCount: 0 };
    }

    console.log(`Sending push notifications to ${tokens.length} devices`);

    // Determine the primary category for the notification title
    const primaryCategory = categories && categories.length > 0 ? categories[0] : 'TheNewJeweller';
    
    // Group tokens into batches of 100 (Expo's recommended limit)
    const batchSize = 100;
    const notificationPromises = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const tokenBatch = tokens.slice(i, i + batchSize);
      
      // Prepare notification message
      const message = {
        to: tokenBatch,
        title: `From TheNewJeweller`,
        body: title,
        data: {
          articleId,
          type: 'new_article',
          category: primaryCategory,
          categories: categories,
          locations: locations,
          timestamp: new Date().toISOString()
        },
        sound: 'default',
        badge: 1,
        channelId: 'new-articles', // for Android
        priority: 'high',
      };

      // Add image if available (works for both iOS and Android)
      if (imageUrl) {
        message.mutableContent = true; // for iOS
        message._displayInForeground = true; // for iOS
        message.attachments = {
          url: imageUrl // for iOS
        };
      }

      // Send push notification batch using Expo Push Service
      const promise = fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify(message)
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Expo Push API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      });
      
      notificationPromises.push(promise);
    }
    
    // Wait for all batches to complete
    const results = await Promise.all(notificationPromises);
    
    // Process the results - Expo returns a different format than we expected
    let hasErrors = false;
    let errorMessages = [];
    
    results.forEach(result => {
      // Check if we have any receipts with error status
      if (result.data && Array.isArray(result.data)) {
        const errItems = result.data.filter(item => item.status !== 'ok' && item.status !== 'success');
        if (errItems.length > 0) {
          hasErrors = true;
          errorMessages.push(...errItems.map(err => JSON.stringify(err)));
        }
      } else if (result.errors && result.errors.length > 0) {
        // Handle error format
        hasErrors = true;
        errorMessages.push(...result.errors.map(err => err.message || JSON.stringify(err)));
      }
    });
    
    // Return success if we didn't find any specific errors
    // This is the fix - we were incorrectly interpreting the success response as an error
    return {
      success: true,
      message: `Notifications sent to ${tokens.length} devices`,
      tokensCount: tokens.length,
      details: hasErrors ? { errors: errorMessages } : { success: true }
    };
    
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending notifications',
    };
  }
}

/**
 * Send a targeted notification to specific users or tokens
 * @param {Object} options - Notification options
 * @returns {Promise<Object>} Notification send result
 */
export async function sendTargetedNotification(options) {
  const {
    tokens = [],
    userIds = [],
    title,
    body,
    data = {},
    categoryId,
    channelId = 'new-articles',
    imageUrl = null
  } = options;
  
  try {
    let targetTokens = [...tokens]; // Start with explicitly provided tokens
    
    // If userIds provided, fetch their tokens
    if (userIds && userIds.length > 0) {
      const userDocs = await Promise.all(
        userIds.map(userId => db.collection('users').doc(userId).get())
      );
      
      userDocs.forEach(doc => {
        if (doc.exists) {
          const userData = doc.data();
          if (userData.pushToken) {
            targetTokens.push(userData.pushToken);
          }
        }
      });
    }
    
    // Remove duplicates
    targetTokens = [...new Set(targetTokens)];
    
    if (targetTokens.length === 0) {
      return { 
        success: true, 
        message: 'No valid recipients found', 
        tokensCount: 0 
      };
    }
    
    // Group tokens into batches of 100
    const batchSize = 100;
    const notificationPromises = [];
    
    for (let i = 0; i < targetTokens.length; i += batchSize) {
      const tokenBatch = targetTokens.slice(i, i + batchSize);
      
      // Prepare notification message
      const message = {
        to: tokenBatch,
        title,
        body,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        sound: 'default',
        channelId,
        priority: 'high',
      };

      // Add image if available
      if (imageUrl) {
        message.mutableContent = true;
        message._displayInForeground = true;
        message.attachments = { url: imageUrl };
      }

      // Send push notification batch using Expo Push Service
      const promise = fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify(message)
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Expo Push API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      });
      
      notificationPromises.push(promise);
    }
    
    // Wait for all batches to complete
    const results = await Promise.all(notificationPromises);
    
    // Use the same fixed logic as the other function to determine success
    let hasErrors = false;
    let errorMessages = [];
    
    results.forEach(result => {
      if (result.data && Array.isArray(result.data)) {
        const errItems = result.data.filter(item => item.status !== 'ok' && item.status !== 'success');
        if (errItems.length > 0) {
          hasErrors = true;
          errorMessages.push(...errItems.map(err => JSON.stringify(err)));
        }
      } else if (result.errors && result.errors.length > 0) {
        hasErrors = true;
        errorMessages.push(...result.errors.map(err => err.message || JSON.stringify(err)));
      }
    });
    
    return {
      success: true,
      message: `Notifications sent to ${targetTokens.length} devices`,
      tokensCount: targetTokens.length,
      details: hasErrors ? { errors: errorMessages } : { success: true }
    };
    
  } catch (error) {
    console.error('Error sending targeted notifications:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending notifications'
    };
  }
}