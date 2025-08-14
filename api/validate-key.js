const admin = require('firebase-admin');

// This code securely retrieves your Firebase Service Account Key from Vercel's environment variables.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async (req, res) => {
  // Enforce that only POST requests are accepted for this endpoint.
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const { key, hwid } = req.body;

  if (!key || !hwid) {
    return res.status(400).json({ status: 'error', message: 'Key and HWID are required.' });
  }

  try {
    // Look up the key in the database
    const keysSnapshot = await db.collectionGroup('keys')
      .where('key_id', '==', key)
      .limit(1)
      .get();

    if (keysSnapshot.empty) {
      return res.status(404).json({ status: 'error', message: 'Key not found.' });
    }

    const keyDoc = keysSnapshot.docs[0];
    const keyData = keyDoc.data();

    // Check if the key is active and not expired
    if (keyData.status !== 'active' || (keyData.expires_at && keyData.expires_at.toDate() < new Date())) {
      return res.status(403).json({ status: 'error', message: 'Key is inactive or expired.' });
    }

    // Check for HWID mismatch
    if (keyData.hwid && keyData.hwid !== hwid) {
      return res.status(403).json({ status: 'error', message: 'HWID mismatch.' });
    }

    // If no HWID is assigned, assign the new one and update the document
    if (!keyData.hwid) {
      await keyDoc.ref.update({ hwid: hwid });
      return res.status(200).json({ status: 'success', message: 'HWID assigned and key validated.' });
    }

    // If HWID matches, the key is valid
    return res.status(200).json({ status: 'success', message: 'Key validated.' });

  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};