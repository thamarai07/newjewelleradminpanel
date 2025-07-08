// lib/fcmService.js
import { messaging } from './firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Get registered FCM tokens from Firestore
 * @param {Object} options - Options for filtering tokens
 * @returns {Promise<Array>} List of valid FCM tokens
 */
async function getFCMTokens(options = {}) {
  const {
    categories = [],
    locations = [],
  } = options;
  
  const db = getFirestore();
  
  try {
    // Get all users with FCM tokens
    const usersSnapshot = await db.collection('users')
      .where('fcmToken', '!=', null)
      .get();

    if (usersSnapshot.empty) {
      console.log('No users with FCM tokens found');
      return [];
    }

    // Extract and filter tokens based on preferences
    const tokens = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      
      // Skip invalid tokens
      if (!userData.fcmToken || typeof userData.fcmToken !== 'string') {
        return;
      }
      
      // Apply category filters if needed
      if (categories.length > 0 && 
          userData.pushNotificationCategories && 
          userData.pushNotificationCategories.length > 0) {
        // Check for category match
        const hasMatchingCategory = categories.some(category => 
          userData.pushNotificationCategories.includes(category)
        );
        
        if (!hasMatchingCategory) {
          return; // Skip if no matching category
        }
      }
      
      // Apply location filters if needed
      if (locations.length > 0 && 
          userData.pushNotificationLocations && 
          userData.pushNotificationLocations.length > 0) {
        // Check for location match
        const hasMatchingLocation = locations.some(location => 
          userData.pushNotificationLocations.includes(location)
        );
        
        if (!hasMatchingLocation) {
          return; // Skip if no matching location
        }
      }
      
      tokens.push(userData.fcmToken);
    });

    return tokens;
  } catch (error) {
    console.error('Error getting FCM tokens:', error);
    throw error;
  }
}

/**
 * Send a notification using FCM v1 API
 * @param {Object} options - Notification options
 * @returns {Promise<Object>} Notification result
 */
export async function sendFCMNotification(options) {
  const {
    tokens = [],
    title,
    body,
    imageUrl,
    data = {},
    android = {},
    apns = {},
    webpush = {},
  } = options;

  try {
    // Validate required fields
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        error: 'No tokens provided',
      };
    }

    if (!title || !body) {
      return {
        success: false,
        error: 'Title and body are required',
      };
    }

    // Send a message to each token using the v1 API
    const results = await Promise.all(tokens.map(token => {
      const message = {
        token,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#e63946',
            channelId: 'new-articles',
            ...android.notification,
          },
          ...android,
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
              ...apns?.payload?.aps,
            },
            ...apns?.payload,
          },
          ...apns,
        },
        webpush: {
          ...webpush,
        },
      };

      // Add image if available
      if (imageUrl) {
        message.android.notification.imageUrl = imageUrl;
        
        if (!message.apns.payload.aps.mutableContent) {
          message.apns.payload.aps.mutableContent = 1;
        }
        
        // Add attachment for iOS
        if (!message.apns.fcmOptions) {
          message.apns.fcmOptions = {};
        }
        message.apns.fcmOptions.imageUrl = imageUrl;
      }

      // Send the message using the Firebase Admin SDK (uses v1 API)
      return messaging.send(message)
        .then(response => ({ success: true, messageId: response }))
        .catch(error => ({ success: false, error: error.message }));
    }));

    // Count successful sends
    const successCount = results.filter(result => result.success).length;
    const failureCount = results.length - successCount;

    // Check if all sends were successful
    if (failureCount === 0) {
      return {
        success: true,
        message: `Notifications sent to ${successCount} devices`,
        tokensCount: successCount,
      };
    } else if (successCount === 0) {
      // All failed
      const errors = results
        .filter(result => !result.success)
        .map(result => result.error)
        .join(', ');
      
      return {
        success: false,
        error: `Failed to send all notifications: ${errors}`,
      };
    } else {
      // Some succeeded, some failed
      return {
        success: true,
        message: `Sent ${successCount} notifications successfully, ${failureCount} failed`,
        partialFailure: true,
        tokensCount: successCount,
      };
    }
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending notifications',
    };
  }
}

/**
 * Send notifications about a new article
 * @param {string} articleId - The article ID
 * @param {string} title - The article title
 * @param {Array} categories - Article categories
 * @param {Array} locations - Article locations
 * @param {string} imageUrl - Article image URL
 * @returns {Promise<Object>} Notification result
 */
export async function sendNewArticleNotification(articleId, title, categories = [], locations = [], imageUrl = null) {
  try {
    // Get tokens based on category and location preferences
    const tokens = await getFCMTokens({ categories, locations });

    if (tokens.length === 0) {
      return {
        success: true,
        message: 'No matching recipients found',
        tokensCount: 0,
      };
    }

    console.log(`Sending FCM notifications to ${tokens.length} devices`);

    // Determine primary category for title
    const primaryCategory = categories && categories.length > 0 ? categories[0] : 'TheNewJeweller';
    const notificationTitle = `From TheNewJeweller`;

    // Send the notification
    const result = await sendFCMNotification({
      tokens,
      title: notificationTitle,
      body: title,
      imageUrl,
      data: {
        articleId,
        type: 'new_article',
        category: primaryCategory,
        categories: categories,
        locations: locations,
      },
      android: {
        notification: {
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          channelId: 'new-articles',
          priority: 'high',
        },
      },
    });

    return result;
  } catch (error) {
    console.error('Error sending article notification:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending article notification',
    };
  }
}

/**
 * Send a notification to specific topic
 * @param {string} topic - The topic to send to
 * @param {Object} options - Notification options
 * @returns {Promise<Object>} Notification result
 */
export async function sendTopicNotification(topic, options) {
  const {
    title,
    body,
    imageUrl,
    data = {},
    android = {},
    apns = {},
  } = options;

  try {
    // Validate required fields
    if (!topic) {
      return {
        success: false,
        error: 'Topic is required',
      };
    }

    if (!title || !body) {
      return {
        success: false,
        error: 'Title and body are required',
      };
    }

    // Create the message
    const message = {
      topic,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#e63946',
          channelId: 'new-articles',
          ...android.notification,
        },
        ...android,
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            ...apns?.payload?.aps,
          },
          ...apns?.payload,
        },
        ...apns,
      },
    };

    // Add image if available
    if (imageUrl) {
      message.android.notification.imageUrl = imageUrl;
      
      if (!message.apns.payload.aps.mutableContent) {
        message.apns.payload.aps.mutableContent = 1;
      }
      
      if (!message.apns.fcmOptions) {
        message.apns.fcmOptions = {};
      }
      message.apns.fcmOptions.imageUrl = imageUrl;
    }

    // Send the message
    const response = await messaging.send(message);

    return {
      success: true,
      message: `Notification sent to topic: ${topic}`,
      messageId: response,
    };
  } catch (error) {
    console.error('Error sending topic notification:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending topic notification',
    };
  }
}