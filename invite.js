/* ==========================================================================
   THE INVITATION — guest page logic.

   Talks to Firestore over the plain REST API. No SDK: thirty people open
   this on phones, often over cellular inside WhatsApp's in-app browser,
   and the Firestore SDK would be the heaviest thing on the page by an
   order of magnitude. It needs exactly one read and one write.
   ========================================================================== */

const KEY = FIREBASE.apiKey;
const DOC = `${REST}/events/${EVENT_ID}`;
const SAVED = `rsvp:${EVENT_ID}`;          /* localStorage: this device's reply */
/* Which document that reply owns. Kept apart from SAVED because SAVED is
   cleared whenever a guest starts their answer over, and the slot has to
   outlive that or the second answer lands as a second guest. */
const SLOT = `rsvp:${EVENT_ID}:slot`;
const TZ = EVENT_TZ;                       /* the party's clock, not the reader's */
const DEFAULT_INVITE_LINE = 'You\u2019re invited to join us for';

/* --- Firestore's typed-value JSON <-> plain objects --------------------- */

/** One typed value out. `{stringValue:'a'}` → `'a'`. */
function readValue(v){
  if (!v) return null;
  if ('stringValue'    in v) return v.stringValue;
  if ('booleanValue'   in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('integerValue'   in v) return Number(v.integerValue);
  if ('doubleValue'    in v) return v.doubleValue;
  if ('nullValue'      in v) return null;
  /* An empty array comes back as `{arrayValue:{}}`, not `{values:[]}`. */
  if ('arrayValue'     in v) return (v.arrayValue.values || []).map(readValue);
  if ('mapValue'       in v) return readFields(v.mapValue.fields || {});
  return null;
}
const readFields = f => Object.fromEntries(Object.entries(f).map(([k,v]) => [k, readValue(v)]));

/** One plain value in. Only the types this build actually writes. */
function writeValue(v){
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return v.length
    ? { arrayValue: { values: v.map(writeValue) } }
    : { arrayValue: {} };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  return { stringValue: String(v) };
}
const writeFields = o => Object.fromEntries(Object.entries(o).map(([k,v]) => [k, writeValue(v)]));

/* --- formatting --------------------------------------------------------- */

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/** "4:00 pm" in the party's clock. */
function clock(iso){
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('en-GB', {hour:'numeric', minute:'2-digit', hour12:true, timeZone:TZ})
          .replace(/\s?([ap])m/i, (_, m) => ` ${m.toLowerCase()}m`);
}

/** 11 → "11th". Worked out, never typed: 1st, 2nd, 3rd, "th" for the rest,
    and 11th–13th, which break the pattern the last digit would predict. */
function ordinal(n){
  const teen = n % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  return n + ({1:'st', 2:'nd', 3:'rd'}[n % 10] || 'th');
}

/** "Sunday, October 11th 2026" in the party's clock.

    Assembled from parts rather than a locale pattern: no locale prints an
    ordinal day, so the pieces have to be named and put back in this order. */
function longDate(iso, withYear = true){
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    weekday:'long', month:'long', day:'numeric', year:'numeric', timeZone:TZ
  }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.weekday}, ${p.month} ${ordinal(Number(p.day))}` + (withYear ? ` ${p.year}` : '');
}

/** The date and the time of day, kept apart. A range shares its meridiem
    where it can — "1:30 – 4:00 pm", not "1:30 pm – 4:00 pm", which is how it
    is said. */
function whenParts(startIso, endIso){
  const day = longDate(startIso);
  if (!day) return { day:'', time:'' };
  const from = clock(startIso);
  const to   = endIso ? clock(endIso) : '';
  if (!to) return { day, time: from };
  const mer = t => (t.match(/([ap])m$/) || [])[1];
  const lead = mer(from) === mer(to) ? from.replace(/\s[ap]m$/, '') : from;
  return { day, time: `${lead} \u2013 ${to}` };
}

/** The when line, set on two lines: the date, then the time under it.

    It used to be one line that wrapped when it had to, and where it wrapped
    depended on the phone — one line on a 414px screen, two on a 390px one,
    and the break landing wherever it landed. Worse, the letter wrapped while
    the card inside the envelope did not, so the same line was set two
    different ways four seconds apart. Both cards now break in the same
    place, on every screen, and it is the place an invitation breaks. */
function whenHTML(startIso, endIso){
  const { day, time } = whenParts(startIso, endIso);
  if (!day) return '';
  return esc(day) + (time ? `<span class="at">${esc(time)}</span>` : '');
}

/** "Saturday, April 25th" — a reply-by date needs no year or clock. */
const shortDate = iso => longDate(iso, false);
/** A postmark writes its month in roman numerals. */
/* Roman numerals are the real postal convention for the month, and nobody
   reading this knows that — it just looks like a serial number on the stamp.
   Plain letters instead. */
function postmarkDate(d){
  const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

/* --- elements ----------------------------------------------------------- */
const $ = id => document.getElementById(id);
const form = $('reply'), rows = $('otherRows');
let EV = null, env = null;

/* --- state: something other than the invitation ------------------------- */
function notice(head, body){
  $('sheet').hidden = true;
  $('replyWrap').hidden = true;
  $('noticeH').textContent = head;
  $('noticeP').textContent = body;
  $('notice').hidden = false;
}

/* ======================================================================== */
/*  A. read the invitation                                                  */
/* ======================================================================== */
async function load(){
  let res;
  try {
    res = await fetch(`${DOC}?key=${KEY}`, {cache:'no-store'});
  } catch {
    notice('This didn’t load', 'Check your connection and open the link again.');
    return;
  }
  /* An unpublished event is denied by the rules, exactly like a missing one.
     A guest should not be able to tell the difference. */
  if (!res.ok) {
    notice('Not quite ready', 'The invitation hasn’t been sent out yet. Try this link again shortly.');
    return;
  }
  const doc = await res.json();
  EV = readFields(doc.fields || {});
  if (EV.published !== true) {
    notice('Not quite ready', 'The invitation hasn’t been sent out yet. Try this link again shortly.');
    return;
  }
  render(doc);
}

function render(doc){
  const hosts = EV.hosts || '';
  const when  = whenHTML(EV.startsAt, EV.endsAt);
  const place = [EV.locationName, EV.address].filter(Boolean).join(', ');

  document.title = `${EV.occasionLine || 'You’re invited'}${hosts ? ' · ' + hosts : ''}`;
  if (EV.waxColor)   document.documentElement.style.setProperty('--wax', EV.waxColor);
  if (EV.stampColor) document.documentElement.style.setProperty('--stamp', EV.stampColor);

  /* --- the envelope --- */
  const posted = new Date(EV.updatedAt || doc.updateTime || Date.now());
  env = Envelope.mount('#sc', {
    /* The return address is where the post would come back to, which is not
       necessarily where the party is — a hall booked for the afternoon is
       nobody's address. Left blank it does not borrow the venue's: the
       envelope simply reads the hosts and the town it was franked in, which
       is what a return address is for. */
    ret:  { name: esc(hosts),
            l1:   esc(EV.returnLine1 || ''),
            l2:   esc(EV.returnLine2 ||
                      (EV.returnLine1 ? '' : (EV.postmarkCity || ''))) },
    mark: { city:   esc((EV.postmarkCity || '').toUpperCase()),
            region: esc((EV.postmarkRegion || '').toUpperCase()),
            date:   postmarkDate(posted) },
    die:   EV.sealDie || 'm-pram',
    stamp: { country:'CANADA', value:'P', art: EV.stampArt || 'art-floral' },
    card: {
      kicker:  esc(EV.inviteLine || DEFAULT_INVITE_LINE),
      occasion: esc(EV.occasionLine || ''),
      name:     esc(EV.honouree || ''),
      when,
      where:    esc(EV.locationName || EV.address || '') +
                (EV.locationName && EV.address ? `<span class="sub">${esc(EV.address)}</span>` : ''),
      note:     esc(EV.hostNote || '')
    }
  }).onOpen(() => {
    document.body.classList.add('opened');
    $('letter').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  });

  /* --- the card --- */
  $('eyebrow').textContent = EV.inviteLine || DEFAULT_INVITE_LINE;
  $('occasion').textContent = EV.occasionLine || '';
  $('honouree').textContent = EV.honouree || '';
  $('dWhen').innerHTML = when;

  /* The address is the map link. A separate "Open in maps" button would be
     a second action competing with Add to calendar. */
  const where = $('dWhere');
  where.textContent = '';
  const a = document.createElement('a');
  a.href = `https://maps.google.com/?q=${encodeURIComponent(place)}`;
  a.target = '_blank'; a.rel = 'noopener';
  a.style.fontSize = 'inherit';
  a.textContent = EV.locationName || EV.address || '';
  where.append(a);
  if (EV.locationName && EV.address) {
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = EV.address;
    where.append(sub);
  }

  /* Only http(s). The hosts are the only people who can write this field,
     but a link on a page thirty people are about to open is not the place to
     take a URL scheme on trust. */
  const reg = String(EV.registryUrl || '').trim();
  if (/^https?:\/\//i.test(reg)) {
    $('registry').href = reg;
    /* The bare host, so a guest can see it is the shop they expect before
       they leave the invitation for it. */
    try { $('registryHost').textContent = new URL(reg).hostname.replace(/^www\./, ''); }
    catch { $('registryHost').textContent = ''; }
    $('registryBox').hidden = false;
  }

  if (EV.replyBy) $('dReply').textContent = shortDate(EV.replyBy);
  else $('dReplyRow').hidden = true;

  /* Note only. The hosts' names are on the envelope's return address and
     nowhere else — the card in the envelope has no signature, and the two
     have to be the same card. */
  if (EV.hostNote) {
    $('hostNote').textContent = EV.hostNote;
    $('hostNote').hidden = false;
  }

  $('sheet').hidden = false;
  $('replyWrap').hidden = false;
  hydrateIcons();

  /* A guest who already replied on this device sees their answer, not a
     blank form (mvp-plan §7E). The envelope is opened for them too — asking
     someone to re-open an envelope they opened last week to find out what
     they already said is a small insult. */
  const saved = JSON.parse(localStorage.getItem(SAVED) || 'null');
  if (saved) {
    showPosted(saved, true);
    env.showOpen();
    document.body.classList.add('opened');
  }
}

/* The skip link points at a letter that is not on the page yet. Open the
   envelope on the way, or the link lands a keyboard user on nothing. */
$('skip').addEventListener('click', e => {
  if (document.body.classList.contains('opened')) return;
  e.preventDefault();
  env?.play();
});

/* ======================================================================== */
/*  B. anyone with you                                                      */
/* ======================================================================== */
const MAX_OTHERS = 10;   /* the security rules cap this too */

function addOther(focus){
  if (rows.children.length >= MAX_OTHERS) return null;
  const row = document.createElement('div');
  row.className = 'other-row blank';
  row.innerHTML = `
    <input class="ruled" type="text" maxlength="80" placeholder="First and last name"
           aria-label="Their first and last name">
    <button class="rm" type="button" aria-label="Remove">${icon('x')}</button>`;
  row.querySelector('.rm').onclick = () => { row.remove(); syncAdd(); };
  rows.append(row);
  /* Hand focus straight to the new blank when a guest asked for it — but
     never when we are replaying a reply they already sent, or the page
     jumps to the reply card on load. */
  if (focus) row.querySelector('input').focus();
  syncAdd();
  return row;
}
function syncAdd(){ $('addOther').hidden = rows.children.length >= MAX_OTHERS; }
$('addOther').onclick = () => addOther(true);

/* ======================================================================== */
/*  C. post the reply                                                       */
/* ======================================================================== */
/* A reply's document id. Guests do not sign in — there is no uid to key a
   reply on — so the device names its own document once and keeps writing to
   that name. 20 characters from a 62-letter alphabet, the same shape as an
   id Firestore would hand out, and unguessable: the id is the only thing
   standing between a stranger and someone else's reply, since the rules
   cannot tell two anonymous writers apart. Nobody but the hosts can read the
   collection, so there is nothing to enumerate. */
function newId(){
  const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(20);
  if (self.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 20; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map(b => A[b % 62]).join('');
}

/** The slot this device replies into: its document id, the moment it first
    replied, and whether anything has been written there yet. createdAt is
    held here rather than read back from the server because a guest cannot
    read the collection — and the rules require an edit to carry the original
    through unchanged, so it has to be remembered. */
function slot(){
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SLOT) || 'null'); } catch {}
  if (s && s.id && s.createdAt) return s;
  s = { id: newId(), createdAt: new Date().toISOString(), posted: false };
  keepSlot(s);
  return s;
}
function keepSlot(s){
  try { localStorage.setItem(SLOT, JSON.stringify(s)); } catch {}
}

/* Two words. The hosts read this list against the people they invited, and
   "Sarah" is not a match when two Sarahs are coming. An initial counts —
   "J Okonkwo" is a name someone actually goes by — so the test is two of
   something, not two long enoughs. */
const isFullName = s => s.trim().split(/\s+/).length >= 2;

/* Say which blank is wrong as well as what is wrong with it. A toast alone
   leaves them looking for the one they missed. */
function reject(el, msg){
  el.classList.add('bad');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block:'center',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  toast(msg, false);
}
form.addEventListener('input', e => e.target.classList?.remove('bad'));

async function post(attending){
  const nameEl = $('guestName');
  const name = nameEl.value.trim();
  if (!name) { reject(nameEl, 'Add your name first'); return; }
  if (!isFullName(name)) { reject(nameEl, 'First and last name, please'); return; }

  /* Blank rows are somebody who changed their mind about adding a name, not
     an error. Filled-in ones have to be whole. */
  const others = [];
  for (const input of rows.querySelectorAll('input')) {
    const v = input.value.trim();
    if (!v) continue;
    if (!isFullName(v)) { reject(input, 'First and last name for everyone with you'); return; }
    others.push(v);
  }
  others.splice(MAX_OTHERS);
  const note = $('note').value.trim();

  /* PATCH, not POST: it writes the named document whether or not it is
     there, so a guest changing their mind edits the reply they already sent
     instead of arriving twice. createdAt stays the first time they answered;
     updatedAt says the answer moved. */
  const s = slot();
  const body = { fields: writeFields(Object.assign({
    eventId: EVENT_ID, name, others, attending,
    note: note || null, createdAt: new Date(s.createdAt)
  }, s.posted ? { updatedAt: new Date() } : null)) };

  const buttons = form.querySelectorAll('button');
  buttons.forEach(b => b.disabled = true);

  let res;
  try {
    res = await fetch(`${REST}/rsvps/${s.id}?key=${KEY}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
  } catch {
    buttons.forEach(b => b.disabled = false);
    toast('That didn’t send. Try again.', false);
    return;
  }
  if (!res.ok) {
    buttons.forEach(b => b.disabled = false);
    /* A rules rejection is a 403 with PERMISSION_DENIED. The guest never
       sees that; they see something they can act on. */
    toast(res.status === 403 ? 'Replies are closed' : 'That didn’t send. Try again.', false);
    return;
  }

  const changed = s.posted;
  s.posted = true;
  keepSlot(s);

  const saved = { name, others, note, attending, at: new Date().toISOString() };
  try { localStorage.setItem(SAVED, JSON.stringify(saved)); } catch {}
  showPosted(saved, false);
  toast(changed ? 'Reply updated' : 'Reply posted');
}

form.addEventListener('submit', e => { e.preventDefault(); post(true); });
$('cant').onclick = () => post(false);

/* ======================================================================== */
/*  D. replied                                                              */
/* ======================================================================== */
function showPosted(saved, returning){
  /* Fill the card back in so the guest sees what they actually sent. */
  $('guestName').value = saved.name;
  rows.innerHTML = '';
  (saved.others || []).forEach(n => {
    const row = addOther(false);
    if (row) row.querySelector('input').value = n;
  });
  $('addOther').hidden = true;
  /* The note goes back in the box too. It is sent with every write, so a
     guest who edits their name without seeing their note would erase it. */
  $('note').value = saved.note || '';
  if (saved.note) $('note').closest('details').open = true;

  document.body.classList.add('replied');
  $('stampDate').textContent = postmarkDate(new Date(saved.at));
  if (returning) form.classList.add('settled');
  form.classList.add('posted');
  form.querySelectorAll('input,textarea,button').forEach(el => el.disabled = true);

  const heads = 1 + (saved.others || []).length;
  const line = $('postedLine');
  line.textContent = saved.attending
    ? `You’re down for ${heads}.`
    : 'We’ll miss you.';
  const again = document.createElement('span');
  again.className = 'again';
  again.textContent = 'Something changed? Fill it in again and we’ll take the newer one.';
  const link = document.createElement('button');
  link.className = 'cant';
  link.type = 'button';
  link.textContent = 'Reply again';
  /* Unposted in place rather than reloaded: their answer is already in the
     card, and the point of coming back is usually to change one line of it. */
  link.onclick = () => {
    try { localStorage.removeItem(SAVED); } catch {}
    document.body.classList.remove('replied');
    form.classList.remove('posted', 'settled');
    form.querySelectorAll('input,textarea,button').forEach(el => el.disabled = false);
    syncAdd();
    line.textContent = '';
    $('guestName').focus({ preventScroll: true });
  };
  again.append(document.createElement('br'), link);
  line.append(again);
}

/* ======================================================================== */
/*  E. add to calendar                                                      */
/* ======================================================================== */
$('cal').onclick = () => {
  const start = new Date(EV.startsAt);
  if (isNaN(start)) { toast('No date set yet', false); return; }
  /* The host's end time when there is one. Three hours is the fallback, and
     only a fallback — a calendar entry that runs to the wrong hour is worse
     than one that is obviously a guess. */
  const ended = EV.endsAt ? new Date(EV.endsAt) : null;
  const end = (ended && !isNaN(ended) && ended > start)
    ? ended : new Date(start.getTime() + 3 * 3600 * 1000);
  const z = d => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const fold = s => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//invitation//EN', 'BEGIN:VEVENT',
    `UID:${EVENT_ID}-${start.getTime()}@invitation`,
    `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(start)}`,
    `DTEND:${z(end)}`,
    `SUMMARY:${fold([EV.occasionLine, EV.honouree].filter(Boolean).join(' — '))}`,
    `LOCATION:${fold([EV.locationName, EV.address].filter(Boolean).join(', '))}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');

  const url = URL.createObjectURL(new Blob([ics], {type:'text/calendar;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url; a.download = 'invitation.ics';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

load();
