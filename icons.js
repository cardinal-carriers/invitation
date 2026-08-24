/* ==========================================================================
   Icons and toasts.

   Lifted from templates/site/app.js. Only the icon set carries over — the
   rail, the demo event and the table helpers belong to the multi-tenant
   product and have no place in a one-invitation build.

   One stroke weight, round caps, stationery-thin.
   ========================================================================== */

const ICONS = {
  cal:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  send:'<path d="M21 4 3 10.5l7 2.7L12.7 21 21 4Z"/><path d="m10 13.2 4.4-4.4"/>',
  copy:'<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
  trash:'<path d="M4.5 6.5h15M9.5 6.5V4.8h5v1.7"/><path d="M6.5 6.5 7.4 20h9.2l.9-13.5"/><path d="M10.5 10v6M13.5 10v6"/>',
  alert:'<path d="M12 4.2 2.8 20h18.4L12 4.2Z"/><path d="M12 10v4.2M12 17.2v.1"/>',
  gift:'<rect x="3" y="6.4" width="18" height="4.2" rx="1.2"/>'+
       '<path d="M4.8 10.6h14.4V19a1.6 1.6 0 0 1-1.6 1.6H6.4A1.6 1.6 0 0 1 4.8 19v-8.4Z"/>'+
       '<path d="M12 6.4v14.2"/>'+
       '<path d="M12 6.4S10.7 3.4 8.8 3.4a2 2 0 0 0 0 4H12Z"/>'+
       '<path d="M12 6.4s1.3-3 3.2-3a2 2 0 0 1 0 4H12Z"/>',
  ext:'<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4"/>'
};

/** Inline icon. `icon('send')` → an <svg> string sized by CSS. */
function icon(name, cls){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls?` class="${cls}"`:''}>${ICONS[name]||''}</svg>`;
}
window.icon = icon;

/** Any [data-icon="cal"] element is filled with that icon. */
function hydrateIcons(root){
  (root || document).querySelectorAll('[data-icon]').forEach(el => {
    if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
  });
}
window.hydrateIcons = hydrateIcons;
document.addEventListener('DOMContentLoaded', () => hydrateIcons());

/** A short confirmation. Says what happened, in the same words as the button. */
/* A tick means it worked. "Add your name first" is not a thing that worked,
   so it gets the alert mark instead — pass ok:false for anything the guest
   still has to deal with. */
function toast(msg, ok = true){
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast' + (ok ? '' : ' toast--warn');
  t.setAttribute('role', ok ? 'status' : 'alert');
  t.innerHTML = icon(ok ? 'check' : 'alert') + `<span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
window.toast = toast;
