/* ==========================================================================
   Firebase web config.

   This file is PUBLIC and safe to commit — the API key included. It is an
   identifier, not a secret; access is controlled entirely by the Firestore
   security rules (mvp-plan §5.3).

   What must NEVER appear in this repo is a service account JSON from
   Project Settings → Service accounts.

   FILL THESE IN from Firebase Console → Project settings → Your apps → Web.
   ========================================================================== */

window.FIREBASE = {
  apiKey:            'REPLACE_ME',
  authDomain:        'REPLACE_ME.firebaseapp.com',
  projectId:         'REPLACE_ME',
  storageBucket:     'REPLACE_ME.firebasestorage.app',
  messagingSenderId: 'REPLACE_ME',
  appId:             'REPLACE_ME'
};

/* The one event, by its fixed document id. */
window.EVENT_ID = 'shower';

/* The subpath GitHub Pages serves this from: '/repo-name/' on a project
   page, '/' on a custom domain or a user page. Derived rather than
   hard-coded so the same file works on localhost and in production. */
window.BASE = location.pathname.replace(/[^/]*$/, '');

/* Firestore REST, for the guest page. No SDK — see mvp-plan §3. */
window.REST = `https://firestore.googleapis.com/v1/projects/${window.FIREBASE.projectId}/databases/(default)/documents`;
