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
const TZ = EVENT_TZ;                       /* the party's clock, not the reader's */

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

/** "Saturday 9 May 2026, 2:00 pm" */
function longDateTime(iso){
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const day = d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:TZ});
  const time = d.toLocaleTimeString('en-GB', {hour:'numeric', minute:'2-digit', hour12:true, timeZone:TZ})
                .replace(/\s?([ap])m/i, (_,p) => ` ${p.toLowerCase()}m`);
  return `${day}, ${time}`;
}
/** "Saturday 25 April" — a reply-by date needs no year or clock. */
function shortDate(iso){
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', timeZone:TZ});
}
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
  const when  = longDateTime(EV.startsAt);
  const place = [EV.locationName, EV.address].filter(Boolean).join(', ');

  document.title = `${EV.occasionLine || 'You’re invited'}${hosts ? ' · ' + hosts : ''}`;
  if (EV.waxColor) document.documentElement.style.setProperty('--wax', EV.waxColor);

  /* --- the envelope --- */
  const posted = new Date(EV.updatedAt || doc.updateTime || Date.now());
  env = Envelope.mount('#sc', {
    ret:  { name: esc(hosts), l1: esc(EV.locationName || ''), l2: esc(EV.address || '') },
    mark: { city:   esc((EV.postmarkCity || '').toUpperCase()),
            region: esc((EV.postmarkRegion || '').toUpperCase()),
            date:   postmarkDate(posted) },
    die:  EV.sealDie || 'm-pram',
    card: {
      kicker:  'You\u2019re invited to join us for',
      occasion: esc(EV.occasionLine || ''),
      name:     esc(EV.honouree || ''),
      meta:     `${esc(when)}<br>${esc(place)}`
    }
  }).onOpen(() => {
    document.body.classList.add('opened');
    $('letter').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  });

  /* --- the card --- */
  $('occasion').textContent = EV.occasionLine || '';
  $('honouree').textContent = EV.honouree || '';
  $('dWhen').textContent = when;

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

  if (EV.replyBy) $('dReply').textContent = shortDate(EV.replyBy);
  else $('dReplyRow').hidden = true;

  if (EV.hostNote) {
    const n = $('hostNote');
    n.textContent = EV.hostNote;
    if (hosts) {
      const sig = document.createElement('span');
      sig.className = 'sig';
      sig.textContent = hosts;
      n.append(sig);
    }
    n.hidden = false;
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
    <input class="ruled" type="text" maxlength="80" placeholder="Their name" aria-label="Their name">
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
async function post(attending){
  const nameEl = $('guestName');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); toast('Add your name first'); return; }

  const others = [...rows.querySelectorAll('input')]
    .map(i => i.value.trim()).filter(Boolean).slice(0, MAX_OTHERS);
  const note = $('note').value.trim();

  const body = { fields: writeFields({
    eventId: EVENT_ID, name, others, attending,
    note: note || null, createdAt: new Date()
  })};

  const buttons = form.querySelectorAll('button');
  buttons.forEach(b => b.disabled = true);

  let res;
  try {
    res = await fetch(`${REST}/rsvps?key=${KEY}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
  } catch {
    buttons.forEach(b => b.disabled = false);
    toast('That didn’t send. Try again.');
    return;
  }
  if (!res.ok) {
    buttons.forEach(b => b.disabled = false);
    /* A rules rejection is a 403 with PERMISSION_DENIED. The guest never
       sees that; they see something they can act on. */
    toast(res.status === 403 ? 'Replies are closed' : 'That didn’t send. Try again.');
    return;
  }

  const saved = { name, others, attending, at: new Date().toISOString() };
  try { localStorage.setItem(SAVED, JSON.stringify(saved)); } catch {}
  showPosted(saved, false);
  toast('Reply posted');
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
  link.onclick = () => { localStorage.removeItem(SAVED); location.reload(); };
  again.append(document.createElement('br'), link);
  line.append(again);
}

/* ======================================================================== */
/*  E. add to calendar                                                      */
/* ======================================================================== */
$('cal').onclick = () => {
  const start = new Date(EV.startsAt);
  if (isNaN(start)) { toast('No date set yet'); return; }
  const end = new Date(start.getTime() + 3 * 3600 * 1000);
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
