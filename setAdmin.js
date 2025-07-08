import { auth } from './lib/firebaseAdmin.js';  // Use ES import syntax

const email = 'thenewjeweller_appadmin@plutuserver.in';  // Replace with the admin email

async function setAdminRole() {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`Successfully set admin role for ${email}`);
  } catch (error) {
    console.error('Error setting admin role:', error);
  }
}

setAdminRole();
