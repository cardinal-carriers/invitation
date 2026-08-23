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
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField,
         collection, query, orderBy, onSnapshot, serverTimestamp, Timestamp,
         arrayUnion, arrayRemove, getDocs, limit }
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
/* Deliberately not a field on the event: that document is world-readable
   once published, so an address kept there is an address handed to every
   guest. See firestore.rules. */
const accessRef = doc(db, 'access', EVENT_ID);
const TZ = EVENT_TZ;

const $ = id => document.getElementById(id);
const show = (id, on) => { $(id).hidden = !on; };

/* ======================================================================== */
/*  Sign in — Google, and only Google                                       */
/*                                                                          */
/*  Email-link sign-in was removed rather than kept as a fallback. Access    */
/*  here is granted by email address, so the rules require a verified one;   */
/*  a Google account arrives already verified and no message has to survive  */
/*  a spam filter to prove it. Institutional mail filters those links, and   */
/*  the people who need this page are on university addresses.               */
/*                                                                          */
/*  Passwords are not offered. They prove nothing about who owns an address, */
/*  and verifying the address is an email again.                             */
/* ======================================================================== */
$('googleBtn').addEventListener('click', async () => {
  const btn = $('googleBtn');
  btn.disabled = true;
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    btn.disabled = false;
    /* Worth naming individually: the provider being switched off is a console
       setting, and a blocked popup is indistinguishable from a dead button. */
    if (err.code === 'auth/operation-not-allowed')
      toast('Turn on Google sign-in in Firebase', false);
    else if (err.code === 'auth/popup-blocked')
      toast('Your browser blocked the popup', false);
    else if (err.code !== 'auth/popup-closed-by-user' &&
             err.code !== 'auth/cancelled-popup-request')
      toast('That didn\u2019t sign you in');
  }
});

$('signOut').onclick = $('strangerOut').onclick = () => signOut(auth);

/* ======================================================================== */
/*  Routing. Three states, no redirects — a redirect loop on an email-link   */
/*  callback is miserable to debug.                                          */
/* ======================================================================== */
let stopReplies = null;
let isOwner = false;

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
  const ev = snap?.exists() ? snap.data() : null;
  const owner = !!ev && ev.hostUid === user.uid;
  /* Matched on email, lowercased at both ends, exactly as the rules do it.
     This is only what the page chooses to draw — the rules are what actually
     decide, and they will refuse the reads if this is wrong. */
  /* Only the rules can see the list now, which is the point of moving it.
     The page finds out whether it is looking at a watcher by trying the read
     the rules guard and seeing whether it is allowed. */
  let watcher = false;
  if (ev && !owner) {
    try { await getDocs(query(collection(db, 'rsvps'), limit(1))); watcher = true; }
    catch { watcher = false; }
  }

  if (!owner && !watcher) {
    $('strangerEmail').textContent = user.email || '';
    show('stranger', true);
    return;
  }

  isOwner = owner;
  applyRole();
  show('signOut', true);
  show('host', true);
  if (owner) { fillEditor(ev); mountPreview(); loadWatchers(ev); }
  watchReplies();
});

/* Everything an owner can do and a watcher cannot, hidden in one place.
   Hiding is a courtesy, not the boundary: firestore.rules refuses each of
   these writes on the server whatever the page renders. */
function applyRole(){
  show('roleNote',  !isOwner);
  show('publishRow', isOwner);
  show('inviteSec',  isOwner);
  show('peopleSec',  isOwner);
}

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
    toast('That didn’t save', false);
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
  }, () => toast('Replies stopped updating. Reload the page.', false));
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

  /* A watcher has no delete: the rules refuse it, so offering the button
     would only produce a failure they cannot act on. */
  if (!isOwner) { el.append(who, side); return el; }

  const del = document.createElement('button');
  del.className = 'btn btn--quiet btn--sm';
  del.type = 'button';
  del.innerHTML = icon('trash');
  del.setAttribute('aria-label', `Delete ${r.name}’s reply`);
  del.onclick = async () => {
    if (!confirm(`Delete ${r.name}’s reply?`)) return;
    try { await deleteDoc(doc(db, 'rsvps', r.id)); toast('Deleted'); }
    catch { toast('That didn’t delete', false); }
  };

  el.append(who, side, del);
  return el;
}

/* ======================================================================== */
/*  3. The editor. Fields map 1:1 to events/shower. One Save, no autosave.   */
/* ======================================================================== */
const TEXT = ['inviteLine','occasionLine','honouree','hosts','locationName','address',
              'hostNote','postmarkCity','postmarkRegion','returnLine1','returnLine2'];
const DEFAULT_INVITE_LINE = 'You\u2019re invited to join us for';
let wax = '#B4736C', die = 'm-pram';
let stampCol = '#B93A2E', stampArtId = 'pooh';

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
  const line = whenLine($('f-startsAt').value, $('f-endsAt').value);
  $('readsStart').innerHTML = line ? `Guests read this as <b>${line}</b>` : '';
}
$('f-startsAt').addEventListener('input', paintReads);
$('f-endsAt').addEventListener('input', paintReads);

function fillEditor(ev){
  TEXT.forEach(k => $('f-' + k).value = ev[k] ?? '');
  $('f-startsAt').value = toLocalInput(ev.startsAt);
  $('f-endsAt').value   = toLocalInput(ev.endsAt);
  $('f-replyBy').value  = toDateInput(ev.replyBy);
  wax = ev.waxColor || wax;
  die = ev.sealDie  || die;
  stampCol   = ev.stampColor || stampCol;
  stampArtId = ev.stampArt   || stampArtId;
  document.documentElement.style.setProperty('--wax', wax);
  document.documentElement.style.setProperty('--stamp', stampCol);
  paintWaxes(); paintDies(); paintStampCols(); paintStamps(); paintReads();
  paintPublish(ev.published === true);
}

$('editor').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('save');
  btn.disabled = true;
  $('saveState').textContent = '';

  const patch = { waxColor: wax, sealDie: die, stampColor: stampCol,
                  stampArt: stampArtId, updatedAt: serverTimestamp() };
  TEXT.forEach(k => patch[k] = $('f-' + k).value.trim());

  const s = $('f-startsAt').value;
  patch.startsAt = s ? Timestamp.fromDate(new Date(s)) : null;
  /* Not `e`: this runs inside the submit handler, whose event argument is
     already called that. */
  const en = $('f-endsAt').value;
  patch.endsAt = en ? Timestamp.fromDate(new Date(en)) : null;
  const r = $('f-replyBy').value;
  /* End of the reply-by day, so a reply that lands that evening is on time. */
  patch.replyBy = r ? Timestamp.fromDate(new Date(`${r}T23:59:59`)) : null;

  try {
    await updateDoc(eventRef, patch);
    $('saveState').textContent = 'Saved';
    toast('Saved');
  } catch {
    toast('That didn’t save', false);
  }
  btn.disabled = false;
});

/* --- wax and seal: pick the physical thing, at the size it is used -------
   Two short palettes rather than one long one shared by both controls. Wax
   and ink are different materials and do not come in the same colours: wax is
   earths and deep tones, postal ink is brighter. Six each — enough to choose
   from, few enough to choose. */
const WAXES = [
  ['Terracotta','#B4736C'], ['Sage','#7E9070'],     ['Burgundy','#7E2A3C'],
  ['Antique gold','#C0913F'], ['Dusty blue','#71889D'], ['Ink','#33302C']
];
const STAMP_INKS = [
  ['Post red','#B93A2E'], ['Dusty blue','#71889D'], ['Sage','#7E9070'],
  ['Marigold','#D08A2C'], ['Rose','#C4767E'],      ['Navy','#2F4258']
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

/* The stamp: its ink, then its picture. Same two controls as the seal,
   because it is the same kind of decision. */
function paintStampCols(){
  $('stampCols').innerHTML = STAMP_INKS.map(([n, c]) =>
    `<button type="button" class="sw" style="background:${c}" data-c="${c}"
       aria-pressed="${c.toLowerCase() === stampCol.toLowerCase()}" aria-label="${n}" title="${n}"></button>`).join('');
}
$('stampCols').addEventListener('click', e => {
  const b = e.target.closest('.sw'); if (!b) return;
  stampCol = b.dataset.c;
  document.documentElement.style.setProperty('--stamp', stampCol);
  paintStampCols();
});

/* Which stamps are a printed detail of the card rather than a drawn symbol.
   Kept in step with PHOTO_STAMPS in envelope.js. */
const PHOTO_STAMP_IDS = ['pooh','piglet','eeyore','tigger'];

function paintStamps(){
  $('stampList').innerHTML = STAMPS.map(([id, name]) => {
    const art = PHOTO_STAMP_IDS.includes(id)
      ? `<img src="assets/stamp-${id}.webp" alt="">`
      : `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${id}" width="100" height="100"/></svg>`;
    return `<button type="button" class="die-btn" data-stamp="${id}" aria-pressed="${id === stampArtId}">
       ${art}<span>${name}</span></button>`;
  }).join('');
}
$('stampList').addEventListener('click', e => {
  const b = e.target.closest('.die-btn'); if (!b) return;
  stampArtId = b.dataset.stamp;
  paintStamps();
  env?.setStamp(stampArtId);
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
  env?.setDie(die);
});

/* ======================================================================== */
/*  The preview. The same Envelope component the guest page mounts, fed      */
/*  from the form instead of from Firestore — so a change shows before it    */
/*  is saved, and a bad line gets caught while it is still cheap to fix.     */
/* ======================================================================== */
let env = null;

const esc = s => String(s ?? '').replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function postmarkDate(d){
  const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

/* Formatted exactly as invite.js formats it. The preview is worth nothing if
   it renders the date differently from the page it is previewing. */
function clock(v){
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d)) return '';
  return d.toLocaleTimeString('en-GB', {hour:'numeric', minute:'2-digit', hour12:true, timeZone:TZ})
          .replace(/\s?([ap])m/i, (_, m) => ` ${m.toLowerCase()}m`);
}
function whenLine(startV, endV){
  const d = startV ? new Date(startV) : null;
  if (!d || isNaN(d)) return '';
  const day = d.toLocaleDateString('en-GB',
    {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:TZ});
  const from = clock(startV), to = clock(endV);
  if (!to) return `${day}, ${from}`;
  const mer = t => (t.match(/([ap])m$/) || [])[1];
  const lead = mer(from) === mer(to) ? from.replace(/\s[ap]m$/, '') : from;
  return `${day}, ${lead} \u2013 ${to}`;
}

const val = id => $('f-' + id).value.trim();

/* Three states, not two: the back of a sealed envelope is where the seal
   and the wax colour actually live, and checking it should not cost the
   whole opening. */
function setFace(which){
  $('faceFront').setAttribute('aria-pressed', String(which === 'front'));
  $('faceBack') .setAttribute('aria-pressed', String(which === 'back'));
  $('faceOpen') .setAttribute('aria-pressed', String(which === 'open'));
}

function mountPreview(){
  if (env) return;
  env = Envelope.mount('#prev', { die, stamp:{ country:'CANADA', value:'P', art: stampArtId } });
  paintPreview();
  /* Opened by default. Sealed, the scene stands empty above the envelope —
     it is reserving the height the card rises into — and the host is mostly
     editing what is printed on the card, which only this face shows. The
     sequence is still one tap away. */
  env.showOpen();
  setFace('open');

  /* envelope.js already plays on click and on Enter/Space. Nothing here
     re-implements that — this only keeps the toggle honest about which side
     is showing. */
  $('prev').addEventListener('click', () => setFace('open'));
  $('faceFront').onclick = () => { env.reset();      setFace('front'); };
  $('faceBack').onclick  = () => { env.showBack();   setFace('back');  };
  $('faceOpen').onclick  = () => { env.showOpen();   setFace('open');  };
}

function paintPreview(){
  if (!env) return;
  env.set('ret.name', esc(val('hosts')))
     .set('ret.l1',   esc(val('returnLine1')))
     .set('ret.l2',   esc(val('returnLine2') ||
                          (val('returnLine1') ? '' : val('postmarkCity'))))
     .set('card.note', esc(val('hostNote')))
     .set('card.kicker', esc(val('inviteLine') || DEFAULT_INVITE_LINE))
     .set('mark.city',   esc(val('postmarkCity').toUpperCase()))
     .set('mark.region', esc(val('postmarkRegion').toUpperCase()))
     /* The guest page postmarks with the date the invitation was last
        touched. Editing it now is that date. */
     .set('mark.date', postmarkDate(new Date()))
     .set('card.occasion', esc(val('occasionLine')))
     .set('card.name',     esc(val('honouree')))
     .set('card.when',  esc(whenLine($('f-startsAt').value, $('f-endsAt').value)))
     .set('card.where', esc(val('locationName') || val('address')) +
        (val('locationName') && val('address') ? `<span class="sub">${esc(val('address'))}</span>` : ''))
     .setDie(die);
}
$('editor').addEventListener('input', paintPreview);

/* ======================================================================== */
/*  4. Who else can see the replies                                         */
/* ======================================================================== */
let watchers = [];

/* The list used to live on events/shower, which is world-readable once the
   invitation is published — every address in it was readable by anyone
   holding the guest link. Move it on sight and clear the old field. Anyone
   who was on that list should be treated as having had their address
   exposed for as long as the invitation was live. */
async function loadWatchers(ev){
  if (Array.isArray(ev.hostEmails) && ev.hostEmails.length) {
    try {
      await setDoc(accessRef, { hostEmails: arrayUnion(...ev.hostEmails) }, { merge: true });
      await updateDoc(eventRef, { hostEmails: deleteField() });
    } catch {
      toast('Publish the new rules, then reload', false);
    }
  }
  try {
    const snap = await getDoc(accessRef);
    paintWatchers(snap.exists() ? (snap.data().hostEmails || []) : []);
  } catch {
    paintWatchers([]);
  }
}

/* The host page is its own sign-in page, so the link to send a watcher is
   just this URL. Nothing about it is secret: it grants nothing on its own,
   and whoever opens it gets in only if their address is on the list. */
const signInUrl = `${location.origin}${BASE}admin.html`;
$('watcherLink').value = signInUrl;
$('copyWatcherLink').onclick = async () => {
  try {
    await navigator.clipboard.writeText(signInUrl);
  } catch {
    $('watcherLink').select(); document.execCommand('copy');
  }
  toast('Copied');
};

function paintWatchers(list){
  watchers = [...list];
  const box = $('watchers');
  box.textContent = '';
  watchers.forEach(addr => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.append(document.createTextNode(addr));

    const x = document.createElement('button');
    x.type = 'button';
    x.innerHTML = icon('x');
    x.setAttribute('aria-label', `Remove ${addr}`);
    x.onclick = async () => {
      try {
        await setDoc(accessRef, { hostEmails: arrayRemove(addr) }, { merge: true });
        paintWatchers(watchers.filter(a => a !== addr));
        toast('Removed');
      } catch { toast('That didn’t save', false); }
    };

    chip.append(x);
    box.append(chip);
  });
}

$('watcherForm').addEventListener('submit', async e => {
  e.preventDefault();
  /* Lowercased on the way in, because the rules compare against a lowercased
     token. Stored as "Sam@…" it would never match and the failure would look
     like a bug in the sign-in rather than a capital letter. */
  const addr = $('watcherEmail').value.trim().toLowerCase();
  if (!addr) return;
  if (watchers.includes(addr)) { $('watcherEmail').value = ''; toast('Already added', false); return; }

  const btn = $('addWatcher');
  btn.disabled = true;
  try {
    /* setDoc-with-merge rather than updateDoc: access/shower does not exist
       until the first person is added, and updateDoc will not create it. */
    await setDoc(accessRef, { hostEmails: arrayUnion(addr) }, { merge: true });
    paintWatchers([...watchers, addr]);
    $('watcherEmail').value = '';
    /* Named so it cannot be read as "invitation sent" — that is the one thing
       this button does not do. */
    toast('Added to the list');
  } catch { toast('That didn’t save', false); }
  btn.disabled = false;
});
