/* ==========================================================================
   THE HOST'S PAGE.

   One person, on wifi, a handful of times. This page gets the real modular
   SDK and its auth helpers — unlike the guest page, which talks REST so it
   stays small (mvp-plan §3).

   SDK version pinned deliberately. Check firebase.google.com/docs/web/setup
   before bumping it.
   ========================================================================== */
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
         onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, query,
         orderBy, onSnapshot, serverTimestamp, Timestamp }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

/* config.js ships with placeholders. Without this the SDK initialises against
   a project that does not exist, no auth state ever arrives, and the page sits
   blank — which is a confusing way to learn you skipped a step. */
if (Object.values(FIREBASE).some(v => String(v).includes('REPLACE_ME'))) {
  document.getElementById('gate').innerHTML =
    '<h1 class="h1">Fill in config.js</h1>' +
    '<p>The Firebase web config is still the placeholder. Copy it from ' +
    'Firebase Console \u2192 Project settings \u2192 Your apps \u2192 Web.</p>';
  document.getElementById('gate').hidden = false;
  throw new Error('config.js not filled in');
}

const app  = initializeApp(FIREBASE);
const auth = getAuth(app);
const db   = getFirestore(app);
const eventRef = doc(db, 'events', EVENT_ID);
const TZ = 'America/Toronto';

const $ = id => document.getElementById(id);
const show = (id, on) => { $(id).hidden = !on; };

/* ======================================================================== */
/*  Sign in — email link, no password                                       */
/* ======================================================================== */
const actionCodeSettings = {
  url: `${location.origin}${BASE}admin.html`,
  handleCodeInApp: true
};

$('gateForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('email').value.trim();
  if (!email) return;
  const btn = $('sendLink');
  btn.disabled = true;
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem('emailForSignIn', email);
    $('gateForm').hidden = true;
    show('sent', true);
  } catch (err) {
    btn.disabled = false;
    toast(err.code === 'auth/invalid-email' ? 'That email doesn’t look right' : 'That didn’t send');
  }
});

/* Complete a sign-in the moment the emailed link is opened, before anything
   else renders, then take the token out of the URL. */
async function completeSignIn(){
  if (!isSignInWithEmailLink(auth, location.href)) return;
  const email = localStorage.getItem('emailForSignIn') || prompt('Confirm your email');
  if (!email) return;
  try {
    await signInWithEmailLink(auth, email, location.href);
    localStorage.removeItem('emailForSignIn');
  } catch {
    toast('That link has expired. Send a new one.');
  }
  history.replaceState(null, '', location.pathname);
}

$('signOut').onclick = $('strangerOut').onclick = () => signOut(auth);

/* ======================================================================== */
/*  Routing. Three states, no redirects — a redirect loop on an email-link   */
/*  callback is miserable to debug.                                          */
/* ======================================================================== */
let stopReplies = null;

await completeSignIn();

onAuthStateChanged(auth, async user => {
  stopReplies?.(); stopReplies = null;
  show('gate', false); show('stranger', false); show('host', false); show('signOut', false);

  if (!user) { show('gate', true); return; }

  let snap;
  try {
    snap = await getDoc(eventRef);
  } catch {
    /* The rules deny the read to anyone who is neither the host nor looking
       at a published event. That is a stranger, not an outage. */
    snap = null;
  }
  if (!snap?.exists() || snap.data().hostUid !== user.uid) {
    $('strangerEmail').textContent = user.email || '';
    show('stranger', true);
    return;
  }

  show('signOut', true);
  show('host', true);
  fillEditor(snap.data());
  watchReplies();
});

/* ======================================================================== */
/*  1. The link                                                             */
/* ======================================================================== */
const publicUrl = `${location.origin}${BASE}`;
$('link').value = publicUrl;
$('open').href = publicUrl;
$('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(publicUrl);
  } catch {
    $('link').select(); document.execCommand('copy');
  }
  toast('Copied');
};

function paintPublish(on){
  $('published').checked = on;
  $('pubLabel').textContent = on ? 'Published' : 'Not published';
  $('pubSay').innerHTML = on
    ? 'Anyone with the link can read the invitation and reply.'
    : 'The link shows <b>Not quite ready</b> to anyone who opens it.';
}
$('published').addEventListener('change', async e => {
  const on = e.target.checked;
  e.target.disabled = true;
  try {
    await updateDoc(eventRef, { published: on, updatedAt: serverTimestamp() });
    paintPublish(on);
    toast(on ? 'Published' : 'Unpublished');
  } catch {
    paintPublish(!on);
    toast('That didn’t save');
  }
  e.target.disabled = false;
});

/* ======================================================================== */
/*  2. Replies — live, because it costs nothing and it is the nicest thing   */
/*     about this page                                                       */
/* ======================================================================== */
function watchReplies(){
  const q = query(collection(db, 'rsvps'), orderBy('createdAt', 'desc'));
  stopReplies = onSnapshot(q, snap => {
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    paintReplies(all);
  }, () => toast('Replies stopped updating. Reload the page.'));
}

function paintReplies(all){
  const yes = all.filter(r => r.attending);
  const heads = yes.reduce((n, r) => n + 1 + (r.others?.length || 0), 0);
  $('heads').textContent = heads;

  const no = all.length - yes.length;
  $('tallyNotes').innerHTML =
    `<span><b>${all.length}</b> ${all.length === 1 ? 'reply' : 'replies'}</span>` +
    (no ? `<span><b>${no}</b> can’t make it</span>` : '');

  const list = $('replies');
  list.textContent = '';
  if (!all.length) {
    list.innerHTML = `<div class="empty"><p>No replies yet. They’ll appear here as they come in.</p></div>`;
    return;
  }
  all.forEach(r => list.append(replyRow(r)));
}

function replyRow(r){
  const el = document.createElement('div');
  el.className = 'reply-row';

  const who = document.createElement('div');
  who.className = 'who';
  const nm = document.createElement('div');
  nm.className = 'nm';
  nm.textContent = r.name || '—';
  who.append(nm);

  if (r.others?.length) {
    const w = document.createElement('div');
    w.className = 'with';
    w.textContent = `with ${r.others.join(', ')}`;
    who.append(w);
  }
  if (r.note) {
    const n = document.createElement('div');
    n.className = 'note';
    n.textContent = r.note;
    who.append(n);
  }

  const side = document.createElement('div');
  const pill = document.createElement('span');
  pill.className = `pill pill--${r.attending ? 'yes' : 'no'}`;
  pill.textContent = r.attending ? `${1 + (r.others?.length || 0)} coming` : 'Can’t make it';
  side.append(pill);

  const when = document.createElement('div');
  when.className = 'when';
  const at = r.createdAt?.toDate?.();
  when.textContent = at
    ? at.toLocaleDateString('en-GB', {day:'numeric', month:'short', timeZone:TZ}) + ', ' +
      at.toLocaleTimeString('en-GB', {hour:'numeric', minute:'2-digit', hour12:true, timeZone:TZ})
    : '';
  side.append(when);

  const del = document.createElement('button');
  del.className = 'btn btn--quiet btn--sm';
  del.type = 'button';
  del.innerHTML = icon('trash');
  del.setAttribute('aria-label', `Delete ${r.name}’s reply`);
  del.onclick = async () => {
    if (!confirm(`Delete ${r.name}’s reply?`)) return;
    try { await deleteDoc(doc(db, 'rsvps', r.id)); toast('Deleted'); }
    catch { toast('That didn’t delete'); }
  };

  el.append(who, side, del);
  return el;
}

/* ======================================================================== */
/*  3. The editor. Fields map 1:1 to events/shower. One Save, no autosave.   */
/* ======================================================================== */
const TEXT = ['occasionLine','honouree','hosts','locationName','address','hostNote'];
let wax = '#B4736C', die = 'm-pram';

/* A datetime-local reads in the browser's timezone. The host is in Ottawa
   and so is the party, so that is right — but the card always prints the
   party's clock, so echo it back rather than leaving him to trust it. */
function toLocalInput(ts){
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d || isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function toDateInput(ts){
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d || isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

function paintReads(){
  const v = $('f-startsAt').value;
  const d = v ? new Date(v) : null;
  $('readsStart').innerHTML = d && !isNaN(d)
    ? `Guests read this as <b>${d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:TZ})}, ` +
      `${d.toLocaleTimeString('en-GB',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:TZ})}</b>`
    : '';
}
$('f-startsAt').addEventListener('input', paintReads);

function fillEditor(ev){
  TEXT.forEach(k => $('f-' + k).value = ev[k] ?? '');
  $('f-startsAt').value = toLocalInput(ev.startsAt);
  $('f-replyBy').value  = toDateInput(ev.replyBy);
  wax = ev.waxColor || wax;
  die = ev.sealDie  || die;
  paintWaxes(); paintDies(); paintReads();
  paintPublish(ev.published === true);
}

$('editor').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('save');
  btn.disabled = true;
  $('saveState').textContent = '';

  const patch = { waxColor: wax, sealDie: die, updatedAt: serverTimestamp() };
  TEXT.forEach(k => patch[k] = $('f-' + k).value.trim());

  const s = $('f-startsAt').value;
  patch.startsAt = s ? Timestamp.fromDate(new Date(s)) : null;
  const r = $('f-replyBy').value;
  /* End of the reply-by day, so a reply that lands that evening is on time. */
  patch.replyBy = r ? Timestamp.fromDate(new Date(`${r}T23:59:59`)) : null;

  try {
    await updateDoc(eventRef, patch);
    $('saveState').textContent = 'Saved';
    toast('Saved');
  } catch {
    toast('That didn’t save');
  }
  btn.disabled = false;
});

/* --- wax and seal: pick the physical thing, at the size it is used ------- */
const WAXES = [
  ['Terracotta','#B4736C'], ['Rose gold','#D8A199'], ['Burgundy','#7E2A3C'],
  ['Antique gold','#C0913F'], ['Post red','#B93A2E'], ['Sage','#7E9070'],
  ['Dusty blue','#71889D'], ['Ivory','#DFD3BC'], ['Ink','#33302C'], ['Navy','#2F4258']
];
function paintWaxes(){
  $('waxes').innerHTML = WAXES.map(([n, c]) =>
    `<button type="button" class="sw" style="background:${c}" data-c="${c}"
       aria-pressed="${c.toLowerCase() === wax.toLowerCase()}" aria-label="${n}" title="${n}"></button>`).join('');
}
$('waxes').addEventListener('click', e => {
  const b = e.target.closest('.sw'); if (!b) return;
  wax = b.dataset.c;
  document.documentElement.style.setProperty('--wax', wax);
  paintWaxes();
});

function paintDies(){
  $('dieList').innerHTML = DIES.map(([id, name]) =>
    `<button type="button" class="die-btn" data-die="${id}" aria-pressed="${id === die}">
       <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${id}" width="100" height="100"/></svg>
       <span>${name}</span></button>`).join('');
}
$('dieList').addEventListener('click', e => {
  const b = e.target.closest('.die-btn'); if (!b) return;
  die = b.dataset.die;
  paintDies();
});
