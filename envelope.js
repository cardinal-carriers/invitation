/* ==========================================================================
   VELLUM — the envelope component
   Mount one with:

       Envelope.mount('#sc', { ret:{…}, card:{…}, die:'m-pram' }).onOpen(fn)

   Markup is generated, not hand-written, because the same envelope appears
   on the guest invitation and in the host's editor preview.

   There is no addressee: one link goes to everyone, so the face reads
   "You're invited" where a name would be.
   ========================================================================== */

const BLOB="M163.7,73.1C167.9,81.7 172.8,91.9 172.8,101.4C172.9,110.9 168.2,121.1 164.0,129.9C159.7,138.8 154.6,148.6 147.3,154.5C139.9,160.5 129.2,163.6 120.0,165.7C110.7,167.7 101.3,167.4 91.7,166.8C82.1,166.2 71.3,166.1 62.6,162.0C53.9,157.9 44.7,150.3 39.6,142.1C34.5,134.0 34.0,122.9 32.1,113.1C30.2,103.3 26.6,92.8 28.3,83.3C30.0,73.9 36.1,63.9 42.5,56.5C48.8,49.1 57.6,43.6 66.1,38.7C74.7,33.8 84.3,27.6 93.7,26.8C103.1,26.1 113.7,30.7 122.7,34.4C131.6,38.2 140.5,43.0 147.3,49.4C154.1,55.9 159.4,64.4 163.7,73.1Z";
const RING="M155.9,111.3C154.1,120.1 150.4,129.7 144.7,136.4C139.1,143.2 130.4,148.4 122.2,151.9C114.0,155.5 104.2,158.3 95.4,157.7C86.6,157.1 76.9,153.3 69.5,148.4C62.1,143.5 55.8,135.9 51.3,128.2C46.8,120.6 43.1,111.2 42.5,102.4C42.0,93.6 43.9,83.2 47.7,75.3C51.6,67.3 58.7,60.1 65.9,54.7C73.0,49.4 82.0,44.7 90.7,43.2C99.4,41.6 109.8,42.6 118.1,45.5C126.4,48.5 134.5,54.4 140.7,60.8C146.9,67.2 152.9,75.5 155.4,83.9C157.9,92.3 157.6,102.6 155.9,111.3Z";

let seq = 0;

const DEFAULTS = {
  ret:  { name:'Amara &amp; Theo', l1:'14 Thornbury Lane', l2:'Ottawa ON&nbsp; K1N 6N5' },
  /* No addressee. One link is forwarded to everyone, so the envelope is
     addressed to whoever is holding it. */
  to:   { name:"You're invited" },
  mark: { city:'OTTAWA', region:'ON · CANADA', date:'09 · V · 26' },
  stamp:{ country:'CANADA', value:'P', art:'art-floral' },
  die:  'm-pram',
  card: { kicker:"You're invited to join us for", occasion:'a baby shower',
          name:'Amara &amp; Theo',
          when:'Saturday, 9 May 2026, 2:00 pm',
          where:'14 Thornbury Lane<span class="sub">Ottawa, ON</span>',
          note:'' }
};

/** The wax seal. Its ids are per-instance so two envelopes can share a page. */
function sealSVG(die, n){
  return `
  <div class="seal">
    <svg class="sealsvg" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="waxFill${n}" cx="34%" cy="27%" r="82%">
          <stop class="wgHi" offset="0"/><stop class="wgMd" offset=".48"/><stop class="wgLo" offset="1"/>
        </radialGradient>
        <radialGradient id="waxSheen${n}" cx="31%" cy="23%" r="44%">
          <stop offset="0" stop-color="#fff" stop-opacity=".26"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="waxShade${n}" cx="72%" cy="79%" r="54%">
          <stop offset="0" stop-color="#2a0d0c" stop-opacity=".32"/>
          <stop offset="1" stop-color="#2a0d0c" stop-opacity="0"/>
        </radialGradient>
        <filter id="wax3d${n}" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="hm"/>
          <feSpecularLighting in="hm" surfaceScale="5" specularConstant=".52" specularExponent="26"
            lighting-color="#ffffff" result="sp"><feDistantLight azimuth="228" elevation="56"/></feSpecularLighting>
          <feComposite in="sp" in2="SourceAlpha" operator="in" result="spc"/>
          <feComposite in="SourceGraphic" in2="spc" operator="arithmetic" k1="0" k2="1" k3=".55" k4="0"/>
        </filter>
        <clipPath id="blobClip${n}"><path d="${BLOB}"/></clipPath>
      </defs>
      <g filter="url(#wax3d${n})"><path d="${BLOB}" fill="url(#waxFill${n})"/></g>
      <g clip-path="url(#blobClip${n})">
        <path d="${BLOB}" fill="url(#waxSheen${n})"/>
        <path d="${BLOB}" fill="url(#waxShade${n})"/>
      </g>
      <path class="w-ring-hi" d="${RING}" fill="none" stroke-width="3.4" transform="translate(0,2)"/>
      <path class="w-ring-lo" d="${RING}" fill="none" stroke-width="3.4"/>
      <g transform="translate(100,100) scale(.95) translate(-50,-50)">
        <use class="w-mot-hi die" href="#${die}" x="0" y="2.2" width="100" height="100"/>
        <use class="w-mot-lo die" href="#${die}" x="0" y="0" width="100" height="100"/>
      </g>
    </svg>
  </div>`;
}

/* The picture on the stamp. A drawn one is a symbol from dies.js, stroked in
   the stamp's own ink; a printed one is a detail of the host's card and fills
   the stamp edge to edge, the way a real pictorial issue does. */
const PHOTO_STAMPS = new Set(['pooh','eeyore','piglet','tigger']);

const isPicture = id => PHOTO_STAMPS.has(id);

function stampArt(id){
  if (isPicture(id)) return `
    <image href="assets/stamp-${id}.webp" x="0" y="0" width="48" height="48"
           preserveAspectRatio="xMidYMid slice"/>`;
  return `<use href="#${id}" width="48" height="48"/>`;
}

function markup(o, n){
  return `
  <div class="env-shadow"></div>
  <div class="env">
    <div class="flip">

      <div class="face front">
        <div class="ret"><b data-f="ret.name">${o.ret.name}</b><span
          data-f="ret.l1">${o.ret.l1}</span><span data-f="ret.l2">${o.ret.l2}</span></div>
        <div class="stamp"><div class="in">
          <span class="cty" data-f="stamp.country">${o.stamp.country}</span>
          <svg class="art${isPicture(o.stamp.art) ? ' art--photo' : ''}" viewBox="0 0 48 48"
       preserveAspectRatio="none">${stampArt(o.stamp.art)}</svg>
          <span class="val" data-f="stamp.value">${o.stamp.value}</span>
        </div></div>
        <div class="postmark">
          <div class="bars"></div>
          <div class="pm1" data-f="mark.city">${o.mark.city}</div><hr class="rule">
          <div class="pm2" data-f="mark.region">${o.mark.region}</div>
          <div class="pm2" data-f="mark.date">${o.mark.date}</div>
        </div>
        <div class="to"><hr class="hr">
          <div class="nm" data-f="to.name">${o.to.name}</div>
        </div>
      </div>

      <div class="face back">
        <div class="panel-base"></div>
        <div class="throat"></div>
        <div class="env-card">
          <div class="ci"></div>
          <div class="ck" data-f="card.kicker">${o.card.kicker}</div>
          <div class="cn" data-f="card.name">${o.card.name}</div>
          <div class="ch" data-f="card.occasion">${o.card.occasion}</div>
          <div class="cwhen"  data-f="card.when">${o.card.when}</div>
          <div class="cwhere" data-f="card.where">${o.card.where}</div>
          <div class="cnote" data-f="card.note">${o.card.note}</div>
          <div class="cband"></div>
        </div>
        <!-- The pocket: everything that lies flat against the back below the
             flap. It is one wrapper rather than three siblings so the three
             share a depth exactly instead of being set to the same number in
             three places, and so the group can be clipped to the envelope's
             own rounded rectangle -- see .pocket. -->
        <div class="pocket">
          <div class="lip"></div>
          <div class="botflap"></div>
          <svg class="creases" viewBox="0 0 144 100" preserveAspectRatio="none" aria-hidden="true">
            <path class="cr-hi" d="M0 100.7 L72 58.7"/><path class="cr-lo" d="M0 100 L72 58"/>
            <path class="cr-hi" d="M144 100.7 L72 58.7"/><path class="cr-lo" d="M144 100 L72 58"/>
          </svg>
        </div>
        <div class="flap"><div class="fside outer"></div><div class="fside inner"></div></div>
        ${sealSVG(o.die, n)}
      </div>

    </div>
  </div>`;
}

function deepMerge(a, b){
  const out = {...a};
  for (const k in b) out[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]))
    ? {...a[k], ...b[k]} : b[k];
  return out;
}

class EnvelopeInstance {
  constructor(el, opts){
    this.el = el;
    this.opened = false;
    this.handlers = [];
    this.n = ++seq;
    this.opts = deepMerge(DEFAULTS, opts || {});
    el.innerHTML = markup(this.opts, this.n);

    el.addEventListener('click', () => this.play());
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.play(); }
    });
  }

  /** Live-update one field, e.g. set('card.occasion', 'a baby shower'). */
  set(path, value){
    this.el.querySelectorAll(`[data-f="${path}"]`).forEach(n => n.innerHTML = value);
    return this;
  }

  /** Swap the picture on the stamp, e.g. setStamp('m-pram'). */
  setStamp(id){
    const svg = this.el.querySelector('.stamp .art');
    if (!svg) return this;
    svg.classList.toggle('art--photo', isPicture(id));
    svg.innerHTML = stampArt(id);
    return this;
  }

  /** Swap the seal die, e.g. setDie('m-rings'). */
  setDie(id){
    this.el.querySelectorAll('.die').forEach(u => u.setAttribute('href', '#' + id));
    return this;
  }

  /** Run time of the whole sequence, read off the CSS beats. The card is the
      last thing to move and now runs 2.05 of its beat: out of the pocket,
      then forward to rest. */
  duration(){
    const u = parseFloat(getComputedStyle(this.el).getPropertyValue('--u')) || 1;
    return (2.36 + 1.15 * 2.05) * u * 1000;
  }

  play(){
    if (this.opened) {           // already open: start it over
      this.reset();
      requestAnimationFrame(() => requestAnimationFrame(() => this.play()));
      return this;
    }
    this.opened = true;
    this.el.classList.add('play');
    this.el.setAttribute('aria-expanded', 'true');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => this.handlers.forEach(fn => fn()), reduced ? 60 : this.duration());
    return this;
  }

  /** Already open, no sequence — for a guest returning to a letter they have
      read before, and for static previews in the host app.

      `noanim` stays on deliberately. The card's rest position is the end of a
      keyframe animation, and taking `noanim` off here would hand that
      animation a real duration a frame after it was told to finish, which
      plays the whole thing. reset() clears the class, so a later click still
      animates. */
  showOpen(){
    this.opened = true;
    this.el.classList.remove('flipped');
    this.el.classList.add('noanim', 'play');
    void this.el.offsetWidth;
    this.el.setAttribute('aria-expanded', 'true');
    return this;
  }

  /** Turned over, still sealed. The host wants to see the back of the
      envelope without sitting through the opening; a guest never does. */
  showBack(on = true){
    if (this.opened) this.reset();
    this.el.classList.toggle('flipped', on);
    return this;
  }

  reset(){
    this.opened = false;
    this.el.classList.add('noanim');
    this.el.classList.remove('play', 'flipped');
    void this.el.offsetWidth;
    this.el.classList.remove('noanim');
    this.el.setAttribute('aria-expanded', 'false');
    return this;
  }

  onOpen(fn){ this.handlers.push(fn); return this; }
}

const Envelope = {
  mount(target, opts){
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    return el ? new EnvelopeInstance(el, opts) : null;
  }
};
window.Envelope = Envelope;
