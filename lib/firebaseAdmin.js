// lib/firebaseAdmin.js
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

// Dynamically read the JSON service account key
const serviceAccount = JSON.parse(
  readFileSync(path.resolve('certs/firebaseAdminKey.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
export const messaging = admin.messaging();