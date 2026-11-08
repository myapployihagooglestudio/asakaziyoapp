// Comprehensive Live Audit & Verification Script for ASAKA ZIYO Firebase Firestore
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const results = [];

function recordTest(testName, passed, details) {
  results.push({ testName, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${testName} | ${details}`);
}

async function runAudit() {
  console.log('====================================================');
  console.log('ASAKA ZIYO: FIREBASE FIRESTORE & AUTH DEEP AUDIT');
  console.log('Database ID:', config.firestoreDatabaseId);
  console.log('Project ID:', config.projectId);
  console.log('====================================================\n');

  // 1. Connection Test
  try {
    const snap = await getDoc(doc(db, 'schedules', 'asaka-main'));
    recordTest('1.1 Firestore Live Connectivity', true, 'Connected to Google Cloud Firestore successfully.');
  } catch (err) {
    recordTest('1.1 Firestore Live Connectivity', false, `Connection error: ${err.message}`);
  }

  // 2. Collection Security: Schedules
  try {
    const snap = await getDoc(doc(db, 'schedules', 'asaka-main'));
    recordTest('2.1 Schedules Public Read', true, 'Public read is allowed.');
  } catch (err) {
    recordTest('2.1 Schedules Public Read', false, `Public read failed: ${err.message}`);
  }

  try {
    await setDoc(doc(db, 'schedules', 'unauth-test'), { test: true });
    recordTest('2.2 Schedules Unauthorized Write Block', false, 'Vulnerability: Unauthenticated write was allowed!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('2.2 Schedules Unauthorized Write Block', isPermissionDenied, `Blocked properly: ${err.code}`);
  }

  // 3. Collection Security: Articles
  try {
    const snap = await getDocs(collection(db, 'articles'));
    recordTest('3.1 Articles Public Read', true, `Public read allowed (${snap.size} docs found).`);
  } catch (err) {
    recordTest('3.1 Articles Public Read', false, `Public read failed: ${err.message}`);
  }

  try {
    await setDoc(doc(db, 'articles', 'malicious-article'), { title: 'Hacked', body: 'Spam' });
    recordTest('3.2 Articles Unauthorized Create Block', false, 'Vulnerability: Unauthenticated article create succeeded!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('3.2 Articles Unauthorized Create Block', isPermissionDenied, `Blocked properly: ${err.code}`);
  }

  // 4. Collection Security: Media Posts & Reels
  try {
    const snap = await getDocs(collection(db, 'mediaPosts'));
    recordTest('4.1 MediaPosts Public Read', true, `Public read allowed (${snap.size} docs found).`);
  } catch (err) {
    recordTest('4.1 MediaPosts Public Read', false, `Public read failed: ${err.message}`);
  }

  try {
    await setDoc(doc(db, 'mediaPosts', 'malicious-media'), { title: 'Spam Reel' });
    recordTest('4.2 MediaPosts Unauthorized Create Block', false, 'Vulnerability: Unauthenticated media create succeeded!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('4.2 MediaPosts Unauthorized Create Block', isPermissionDenied, `Blocked properly: ${err.code}`);
  }

  // 5. Collection Security: Hadiths
  try {
    const snap = await getDocs(collection(db, 'hadiths'));
    recordTest('5.1 Hadiths Public Read', true, `Public read allowed (${snap.size} docs found).`);
  } catch (err) {
    recordTest('5.1 Hadiths Public Read', false, `Public read failed: ${err.message}`);
  }

  try {
    await setDoc(doc(db, 'hadiths', 'fake-hadith'), { text: 'Fake' });
    recordTest('5.2 Hadiths Unauthorized Write Block', false, 'Vulnerability: Unauthenticated hadith write succeeded!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('5.2 Hadiths Unauthorized Write Block', isPermissionDenied, `Blocked properly: ${err.code}`);
  }

  // 6. Collection Security: Dhikrs
  try {
    const snap = await getDocs(collection(db, 'dhikrs'));
    recordTest('6.1 Dhikrs Public Read', true, `Public read allowed (${snap.size} docs found).`);
  } catch (err) {
    recordTest('6.1 Dhikrs Public Read', false, `Public read failed: ${err.message}`);
  }

  try {
    await setDoc(doc(db, 'dhikrs', 'fake-dhikr'), { title: 'Fake' });
    recordTest('6.2 Dhikrs Unauthorized Write Block', false, 'Vulnerability: Unauthenticated dhikr write succeeded!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('6.2 Dhikrs Unauthorized Write Block', isPermissionDenied, `Blocked properly: ${err.code}`);
  }

  // 7. Collection Security: Inquiries
  const testInquiryId = 'inq-test-' + Date.now();
  try {
    await setDoc(doc(db, 'inquiries', testInquiryId), {
      userName: 'Audit Test User',
      message: 'Savol matni',
      status: 'pending',
    });
    recordTest('7.1 Inquiries Public Submission (Valid)', true, 'Public user can submit legitimate inquiry.');
  } catch (err) {
    recordTest('7.1 Inquiries Public Submission (Valid)', false, `Valid inquiry submission failed: ${err.message}`);
  }

  // Test invalid inquiry submission (e.g. status != 'pending' or missing required fields)
  try {
    await setDoc(doc(db, 'inquiries', 'inq-invalid-' + Date.now()), {
      userName: 'Hacker',
      message: 'Test',
      status: 'answered', // Tampering with status
    });
    recordTest('7.2 Inquiries Tamper Protection (Invalid status)', false, 'Vulnerability: Inquiry with forged status: answered was accepted!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('7.2 Inquiries Tamper Protection (Invalid status)', isPermissionDenied, `Blocked tampering: ${err.code}`);
  }

  // Test reading inquiries as unauthenticated user
  try {
    await getDoc(doc(db, 'inquiries', testInquiryId));
    recordTest('7.3 Inquiries Privacy Protection (Unauth Read)', false, 'Vulnerability: Unauthenticated user can read private inquiries!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('7.3 Inquiries Privacy Protection (Unauth Read)', isPermissionDenied, `Private data guarded: ${err.code}`);
  }

  // 8. Collection Security: Telegram Drafts & Moderation Queue
  try {
    await getDoc(doc(db, 'drafts', 'draft-1'));
    recordTest('8.1 Telegram Drafts Non-Admin Read Block', false, 'Vulnerability: Drafts readable without admin credentials!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('8.1 Telegram Drafts Non-Admin Read Block', isPermissionDenied, `Drafts protected: ${err.code}`);
  }

  try {
    await setDoc(doc(db, 'drafts', 'fake-draft'), { content: 'Phishing post' });
    recordTest('8.2 Telegram Drafts Non-Admin Write Block', false, 'Vulnerability: Drafts writable without admin credentials!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('8.2 Telegram Drafts Non-Admin Write Block', isPermissionDenied, `Drafts write protected: ${err.code}`);
  }

  // 9. Collection Security: Admins Collection
  try {
    await setDoc(doc(db, 'admins', 'fake-admin-uid'), {
      role: 'superadmin',
      email: 'attacker@evil.com',
    });
    recordTest('9.1 Admins Self-Promotion Block', false, 'Critical Vulnerability: Unauthenticated user created admin record!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('9.1 Admins Self-Promotion Block', isPermissionDenied, `Admin collection protected: ${err.code}`);
  }

  // 10. Notifications Security
  try {
    await setDoc(doc(db, 'notifications', 'spam-notif'), { title: 'Spam' });
    recordTest('10.1 Notifications Non-Admin Write Block', false, 'Vulnerability: Unauthenticated user wrote notification!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('10.1 Notifications Non-Admin Write Block', isPermissionDenied, `Notifications protected: ${err.code}`);
  }

  // 11. Server-Side Vault & Lock Protection
  try {
    await getDoc(doc(db, '_server_vault', 'master_key'));
    recordTest('11.1 Server Vault Read Block', false, 'Critical Vulnerability: _server_vault/master_key is readable by client!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('11.1 Server Vault Read Block', isPermissionDenied, `Vault protected: ${err.code}`);
  }

  try {
    await setDoc(doc(db, '_server_gate', 'lock'), { secret: 'forged', batchId: '123' });
    recordTest('11.2 Server Gate Forgery Block', false, 'Critical Vulnerability: _server_gate/lock forged without secret!');
  } catch (err) {
    const isPermissionDenied = err.code === 'permission-denied' || String(err).includes('PERMISSION_DENIED');
    recordTest('11.2 Server Gate Forgery Block', isPermissionDenied, `Gate protected: ${err.code}`);
  }

  // 12. Authenticated Admin Server-Mediated Write, Live Firestore Read-Back, Diagnostics & Cleanup
  const BASE_URL = 'http://127.0.0.1:3000';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'menageradmin',
        password: process.env.ADMIN_PASSWORD || 'menageradmin1',
      }),
    });
    const loginJson = await loginRes.json();
    const token = loginJson.token;
    recordTest(
      '12.1 Admin Authentication (menageradmin)',
      loginRes.status === 200 && Boolean(token),
      `Authenticated as ${loginJson.admin?.username} (${loginJson.admin?.uid})`
    );

    if (token) {
      // Run 7-point Firestore Diagnostics
      const diagRes = await fetch(`${BASE_URL}/api/admin/firestore/diagnostics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const diagJson = await diagRes.json();
      recordTest(
        '12.2 Genuine 7-Point Firestore Diagnostics',
        diagRes.status === 200 && (diagJson.status === 'healthy' || diagJson.status === 'PASS' || diagJson.success === true),
        `Status: ${diagJson.status} | Latency: ${diagJson.latencyMs}ms`
      );

      // Clean up the testInquiryId created in step 7.1 so no test artifact remains in Firestore
      const delInqRes = await fetch(`${BASE_URL}/api/admin/firestore/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collectionName: 'inquiries',
          docId: testInquiryId,
        }),
      });
      recordTest(
        '12.3 Test Inquiry Cleanup from Live Firestore',
        delInqRes.status === 200,
        `Cleaned up temporary inquiry ${testInquiryId}`
      );
    }
  } catch (err) {
    recordTest('12.1 Admin Server Integration', false, `Server test error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('AUDIT SUMMARY');
  console.log('Total Tests:', results.length);
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;
  console.log(`Passed: ${passedCount} / ${results.length}`);
  console.log(`Failed: ${failedCount} / ${results.length}`);
  console.log('====================================================');

  process.exit(failedCount > 0 ? 1 : 0);
}

runAudit();
