/* ==========================================================================
   VELLUM — seal dies & stamp art
   Each die is one SVG <symbol>, so adding a design costs one path. Host art
   uploads drop in the same way.

   The Winnie-the-Pooh dies drawn in Phase 0 are deliberately NOT here. Milne
   & Shepard's 1926 text is US public domain, but Disney holds trademark on
   their Pooh design and on the name, so those stay in the study until that
   is settled. See templates/envelope-animations.html.
   ========================================================================== */

const DIES = [
  ['m-sprig', 'Sprig',     'general'],
  ['m-heart', 'Heart',     'general'],
  ['m-mono',  'Monogram',  'general'],
  ['m-rings', 'Rings',     'wedding'],
  ['m-pram',  'Pram',      'baby shower'],
  ['m-hunny', 'Honey pot', 'baby shower'],
  ['m-pooh',  'Pooh',      'baby shower']
];
window.DIES = DIES;

/* What can go on the stamp. The first is the engraved flower the stamp shipped
   with; the rest are the seal dies, which are drawn in stroke and so take the
   stamp's ink without any extra art. 'pooh' is the one photographic option and
   is a cropped detail of the host's own card, not a symbol. */
const STAMPS = [
  ['pooh',        'Pooh'],
  ['art-floral',  'Flower'],
  ['art-leaf',    'Maple leaf'],
  ['art-cardinal','Cardinal'],
  ['art-bee',     'Bee'],
  ['art-rattle',  'Rattle'],
  ['art-balloon', 'Balloon'],
  ['m-sprig',     'Sprig'],
  ['m-heart',     'Heart'],
  ['m-pram',      'Pram'],
  ['m-hunny',     'Honey pot'],
  ['m-pooh',      'Pooh, engraved'],
  ['m-rings',     'Rings']
];
window.STAMPS = STAMPS;

document.addEventListener('DOMContentLoaded', () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs>
<symbol id="art-floral" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
    <path d="M24 44V22"/><path d="M24 30c-7 0-11-4-12-10 7-1 11 3 12 10zM24 26c7-1 10-6 10-12-7 1-10 5-10 12z"/>
    <circle cx="24" cy="14" r="6"/><path d="M24 4v4M15 8l2.6 3M33 8l-2.6 3"/></g></symbol>
<symbol id="m-sprig" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 90C50 70 50 48 55 16"/>
      <path d="M50 76c-11 1-19-5-23-15 11-3 20 3 23 15z"/>
      <path d="M52 66c11-2 17-11 17-22-11 3-17 11-17 22z"/>
      <path d="M52 54c-11 1-18-6-21-16 11-2 19 4 21 16z"/>
      <path d="M54 43c10-3 16-11 16-22-11 3-16 11-16 22z"/>
      <path d="M55 32c-9-1-15-8-17-17 10-1 16 6 17 17z"/>
      <path d="M56 22c2-8 6-13 12-16"/>
    </g></symbol>
<symbol id="m-heart" viewBox="0 0 100 100">
    <path fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"
      d="M50 82S18 62 18 40a17 17 0 0132-8 17 17 0 0132 8c0 22-32 42-32 42z"/></symbol>
<symbol id="m-mono" viewBox="0 0 100 100">
    <text x="50" y="70" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-size="60"
      font-weight="600" fill="currentColor" class="mono-t">A</text></symbol>
<symbol id="m-rings" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.6">
      <circle cx="37" cy="60" r="23"/><circle cx="63" cy="60" r="23"/>
      <path d="M63 25l-7 10h14z" stroke-width="4" stroke-linejoin="round"/>
      <path d="M56 35h14" stroke-width="3.4"/>
    </g></symbol>
<symbol id="m-pram" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 48a38 22 0 0076 0Z"/>
      <path d="M50 48V25c15-3 28 5 33 18"/>
      <path d="M12 48c-6-6-5-15 2-19"/>
      <circle cx="34" cy="77" r="8.5"/><circle cx="68" cy="77" r="8.5"/>
    </g></symbol>
<symbol id="m-hunny" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="30" rx="25" ry="7.5"/>
      <path d="M25 30c-7 11-9 26-5 37 4 10 14 15 30 15s26-5 30-15c4-11 2-26-5-37"/>
      <path d="M20 54c20 5 40 5 60 0"/>
      <path d="M23 69c18 4 36 4 54 0"/>
    </g></symbol>

<symbol id="m-pooh" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="26" cy="28" r="12"/><circle cx="74" cy="28" r="12"/>
      <circle cx="50" cy="52" r="30"/>
      <ellipse cx="50" cy="66" rx="16" ry="12"/>
      <ellipse cx="50" cy="56.5" rx="5.5" ry="4"/>
      <path d="M50 60.5v3.5"/>
      <path d="M39 67.5c3.5 5 7.5 5 11 .5"/><path d="M61 67.5c-3.5 5-7.5 5-11 .5"/>
      <path d="M38 45h.01"/><path d="M62 45h.01"/>
    </g></symbol>
<symbol id="art-leaf" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 88V54"/>
      <path d="M50 54 32 61 36 49 17 43 26 37 20 21 36 27 40 14 50 27 60 14 64 27 80 21 74 37 83 43 64 49 68 61Z"/>
    </g></symbol>
<symbol id="art-bee" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="62" rx="17" ry="21"/>
      <path d="M34 56h32M34 68h32"/>
      <path d="M41 44C31 30 18 27 12 35c4 10 18 14 28 10z"/>
      <path d="M59 44C69 30 82 27 88 35c-4 10-18 14-28 10z"/>
      <path d="M45 33l-4-9M55 33l4-9"/>
    </g></symbol>
<symbol id="art-rattle" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="42" cy="38" r="21"/>
      <path d="M35 27a12 12 0 0 1 9-5"/>
      <path d="M57 53l14 17"/>
      <path d="M76 82a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/>
    </g></symbol>
<symbol id="art-balloon" viewBox="0 0 100 100">
    <g fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="50" cy="38" rx="22" ry="26"/>
      <path d="M45 63l5 7 5-7"/>
      <path d="M50 70c0 11-12 12-12 23"/>
    </g></symbol>
<symbol id="art-cardinal" viewBox="0 0 100 100">
    <!-- The perched bird, filled. Stamps are printed, not struck, so a
         solid silhouette suits them where the stroked seal dies do not. -->
    <g transform="translate(11,2) scale(1.5)">
<g fill="currentColor">
  <path d="M20.5 39 L13 62 L22.5 62 L27 43 Z"/>
  <ellipse cx="25" cy="33" rx="10.4" ry="13.6"/>
  <circle cx="28.4" cy="17.6" r="8.6"/>
  <path d="M23 12.2 C19.6 5 22.4 0.2 29.4 -1.4 C26.2 3 27.4 7.6 31.8 11 Z"/>
  <path d="M35.4 15.6 L44 19.2 L35.4 22.8 Z"/>
  <path d="M22.4 45.4h2v7.2h-2z"/><path d="M27.4 45.4h2v7.2h-2z"/>
  <path d="M4 55.6 C13 52.4 26 51 41 51.8 L41 55.2 C26 54.4 13 55.6 4 58.4 Z"/>
</g>
</g></symbol>
</defs>`;
  document.body.appendChild(svg);
});
