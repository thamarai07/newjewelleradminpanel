// lib/firebaseAdmin.js
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

// Dynamically read the JSON service account key
const serviceAccount = JSON.parse(
  readFileSync(path.resolve('certs/firebaseAdminKey.json'), 'utf-8')
);

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

if (!admin.apps.length) {
     admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        clientId: process.env.FIREBASE_CLIENT_ID,
      }),
     });
  }




export const auth = admin.auth();
export const db = admin.firestore();
export const messaging = admin.messaging();