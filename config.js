/* ==========================================================================
   Firebase web config.

   This file is PUBLIC and safe to commit — the API key included. It is an
   identifier, not a secret; access is controlled entirely by the Firestore
   security rules (mvp-plan §5.3).

   What must NEVER appear in this repo is a service account JSON from
   Project Settings → Service accounts.

   From Firebase Console → Project settings → Your apps → Web. measurementId is
   deliberately absent: no Analytics (mvp-plan §13).
   ========================================================================== */

window.FIREBASE = {
  apiKey:            'AIzaSyDVll4D6ramjMIGCJkldGbo8MFPjdMQPgM',
  authDomain:        'cardinal-carriers.firebaseapp.com',
  projectId:         'cardinal-carriers',
  storageBucket:     'cardinal-carriers.firebasestorage.app',
  messagingSenderId: '159373025954',
  appId:             '1:159373025954:web:6ca7c14b4d265902426dfb'
};

/* The one event, by its fixed document id. */
window.EVENT_ID = 'shower';

/* The party's clock — not the reader's, and not the host's. Every date the
   card prints is formatted in this zone, so a guest reading the invitation
   in another province still sees the time they should arrive.

   Calgary is Mountain. Getting this wrong is a quiet two-hour error that
   nothing else in the page would catch. */
window.EVENT_TZ = 'America/Edmonton';

/* The subpath GitHub Pages serves this from: '/repo-name/' on a project
   page, '/' on a custom domain or a user page. Derived rather than
   hard-coded so the same file works on localhost and in production. */
window.BASE = location.pathname.replace(/[^/]*$/, '');

/* Firestore REST, for the guest page. No SDK — see mvp-plan §3. */
window.REST = `https://firestore.googleapis.com/v1/projects/${window.FIREBASE.projectId}/databases/(default)/documents`;
