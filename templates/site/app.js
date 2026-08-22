/* ==========================================================================
   VELLUM — app shell
   The rail is one component, not seven copies. A page declares which nav
   item is current with  <body data-nav="guests">  and the shell renders.
   When this moves to Next.js it becomes <Rail current="guests" />.
   ========================================================================== */

/* --- icon set. One stroke weight, round caps, stationery-thin. ---------- */
const ICONS = {
  desk:'<path d="M3 9.5 12 4l9 5.5"/><path d="M5 11v8h14v-8"/><path d="M9.5 19v-4.5h5V19"/>',
  card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h4"/>',
  users:'<path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="10" cy="8" r="3.2"/><path d="M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6"/>',
  send:'<path d="M21 4 3 10.5l7 2.7L12.7 21 21 4Z"/><path d="m10 13.2 4.4-4.4"/>',
  reply:'<path d="M3 6.5 12 13l9-6.5"/><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m15 15.5 2 2 4-4.5"/>',
  gift:'<rect x="3" y="9" width="18" height="11" rx="1.6"/><path d="M3 13h18M12 9v11"/><path d="M12 9C10.5 5 8.8 4 7.6 4.5 6.2 5.1 6.4 7.4 8 8.4c1 .6 2.6.6 4 .6 1.4 0 3 0 4-.6 1.6-1 1.8-3.3.4-3.9C15.2 4 13.5 5 12 9Z"/>',
  gear:'<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="6.4"/><path d="m16 16 4.5 4.5"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  chev:'<path d="m9 5 7 7-7 7"/>',
  chevd:'<path d="m6 9 6 6 6-6"/>',
  dots:'<circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none"/>',
  download:'<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 17.5v2h15v-2"/>',
  upload:'<path d="M12 15.5v-11M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 17.5v2h15v-2"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  pin:'<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  clock:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.8"/>',
  trash:'<path d="M4.5 6.5h15M9.5 6.5V4.8h5v1.7"/><path d="M6.5 6.5 7.4 20h9.2l.9-13.5"/><path d="M10.5 10v6M13.5 10v6"/>',
  edit:'<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z"/><path d="m14.5 6.5 3.5 3.5"/>',
  ext:'<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4"/>',
  info:'<circle cx="12" cy="12" r="8.4"/><path d="M12 11.2v5M12 8.1v.1"/>',
  alert:'<path d="M12 4.2 2.8 20h18.4L12 4.2Z"/><path d="M12 10v4.2M12 17.2v.1"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  opened:'<path d="M3 10.5 12 4l9 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-8.5Z"/><path d="m3 10.5 9 6 9-6"/>',
  arrow:'<path d="M4.5 12h15M14 6.5 19.5 12 14 17.5"/>',
  copy:'<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
  eye:'<path d="M2.6 12S6.5 5.6 12 5.6 21.4 12 21.4 12 17.5 18.4 12 18.4 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="3"/>',
  bell:'<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4.2 1.5 5.5 1.5 5.5H5S6.5 14.2 6.5 10Z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>'
};

/** Inline icon. `icon('send')` → an <svg> string sized by CSS. */
function icon(name, cls){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls?` class="${cls}"`:''}>${ICONS[name]||''}</svg>`;
}
window.icon = icon;

/* --- the event in context. One demo event across every screen. ---------- */
const EVENT = {
  name:'A baby shower for Amara',
  short:"Amara's shower",
  date:'Saturday 9 May 2026',
  time:'2:00 pm',
  place:'14 Thornbury Lane, Ottawa',
  guests:148, replied:96, yes:84, no:9, maybe:3, opened:127, posted:148
};
window.EVENT = EVENT;

const NAV = [
  { group:null, items:[ ['desk','Desk','dashboard.html','desk'] ] },
  { group:EVENT.short, items:[
      ['event','Invitation','event.html','card'],
      ['guests','Guest list','guests.html','users','guests'],
      ['send','Send','send.html','send'],
      ['rsvps','Replies','rsvps.html','reply','replied']
  ]},
  { group:'Account', items:[ ['settings','Settings','settings.html','gear'] ] }
];

function renderRail(current){
  /* A desk with no events has no event context to show, so the rail drops
     that whole group rather than showing an empty one. */
  const nav = document.body.dataset.event === 'none'
    ? NAV.filter(g => g.group !== EVENT.short)
    : NAV;
  const groups = nav.map(g => `
    <div class="rail-grp">
      ${g.group ? `<div class="label">${g.group}</div>` : ''}
      ${g.items.map(([id,label,href,ic,countKey]) => {
        /* Counts are read at render time, not captured when this file loads, so
           a page can adjust EVENT before the rail is drawn. */
        const n = countKey ? EVENT[countKey] : null;
        return `
        <a class="nav" href="${href}"${id===current?' aria-current="page"':''}>
          ${icon(ic)}<span>${label}</span>
          ${n ? `<span class="count">${n}</span>` : ''}
        </a>`;
      }).join('')}
    </div>`).join('');

  return `
    <a class="rail-brand" href="dashboard.html">
      <span class="wax-mark" aria-hidden="true">V</span>Vellum
    </a>
    ${groups}
    <div class="rail-ft">
      <a class="nav" href="settings.html">
        <span class="who-mark who-mark--sky" style="width:26px;height:26px;font-size:12px">T</span>
        <span>Theo Vance</span>
      </a>
    </div>`;
}

/* --- boot --------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const rail = document.querySelector('.rail');
  if (rail) rail.innerHTML = renderRail(document.body.dataset.nav);

  /* Any [data-icon="send"] element is filled with that icon. */
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
  });

  /* Segmented controls and tab strips: one handler for the whole app. */
  document.addEventListener('click', e => {
    const seg = e.target.closest('.seg button');
    if (seg) {
      seg.parentElement.querySelectorAll('button')
        .forEach(b => b.setAttribute('aria-pressed', b === seg));
      const panel = seg.dataset.panel;
      if (panel) {
        document.querySelectorAll(`[data-panel-for="${seg.parentElement.dataset.seg}"]`)
          .forEach(p => p.hidden = p.dataset.panelName !== panel);
      }
    }
    const tab = e.target.closest('.tabs button');
    if (tab && tab.dataset.tab) {
      tab.parentElement.querySelectorAll('button')
        .forEach(b => b.setAttribute('aria-selected', b === tab));
      document.querySelectorAll('[data-tabpanel]')
        .forEach(p => p.hidden = p.dataset.tabpanel !== tab.dataset.tab);
    }
  });

  /* Select-all checkbox in list headers. */
  document.querySelectorAll('[data-check-all]').forEach(master => {
    const scope = document.getElementById(master.dataset.checkAll);
    master.addEventListener('change', () => {
      scope.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = master.checked);
      updateSelection();
    });
    scope.addEventListener('change', updateSelection);
  });
});

/** Reflects how many rows are ticked into any [data-selection-count]. */
function updateSelection(){
  const n = document.querySelectorAll('tbody input[type=checkbox]:checked').length;
  document.querySelectorAll('[data-selection]').forEach(el => el.hidden = n === 0);
  document.querySelectorAll('[data-selection-count]').forEach(el => el.textContent = n);
}

/** A short confirmation. Says what happened, in the same words as the button. */
function toast(msg){
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role','status');
  t.innerHTML = icon('check') + `<span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
window.toast = toast;
