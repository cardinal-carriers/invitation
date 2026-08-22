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
  ['m-hunny', 'Honey pot', 'baby shower']
];
window.DIES = DIES;

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
</defs>`;
  document.body.appendChild(svg);
});
