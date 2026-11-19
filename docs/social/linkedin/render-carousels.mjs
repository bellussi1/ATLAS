import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

function dataUri(absPath, mime) {
  const buf = readFileSync(absPath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const FONTS = {
  archivo: dataUri(resolve(repoRoot, 'public/fonts/Archivo-latin-wdth-wght.woff2'), 'font/woff2'),
  mono: dataUri(resolve(repoRoot, 'public/fonts/IBMPlexMono-Regular.woff2'), 'font/woff2'),
  zillaReg: dataUri(resolve(repoRoot, 'public/fonts/ZillaSlab-Regular.woff2'), 'font/woff2'),
  zillaSemi: dataUri(resolve(repoRoot, 'public/fonts/ZillaSlab-SemiBold.woff2'), 'font/woff2'),
  zillaBold: dataUri(resolve(repoRoot, 'public/fonts/ZillaSlab-Bold.woff2'), 'font/woff2'),
  zillaItalic: dataUri(resolve(repoRoot, 'public/fonts/ZillaSlab-Italic.woff2'), 'font/woff2'),
};

const LOGOS = {
  ink: dataUri(resolve(repoRoot, 'public/brand/atlas-logo.svg'), 'image/svg+xml'),
  inverse: dataUri(resolve(repoRoot, 'public/brand/atlas-logo-inverse.svg'), 'image/svg+xml'),
};

function asset(name) {
  return dataUri(resolve(here, 'assets', name), 'image/jpeg');
}

const ASSETS = {
  itinerario: asset('itinerario.jpg'),
  leituraTop: asset('leitura-top.jpg'),
  leitura: asset('leitura.jpg'),
  grafoLocal: asset('grafo-local.jpg'),
  grafoDetalhe: asset('grafo-detalhe.jpg'),
  karlMarx: asset('karl-marx.jpg'),
  fontes: asset('fontes.jpg'),
  home: asset('home.jpg'),
  zoomBar: asset('zoom-bar.jpg'),
  mapa1930: asset('mapa-1930.jpg'),
  mapaRecorte: asset('mapa-recorte.jpg'),
  grafoLacunas: asset('grafo-lacunas.jpg'),
};

const esc = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const BASE_CSS = `
  @font-face {
    font-family: 'Archivo';
    src: url('${FONTS.archivo}') format('woff2-variations');
    font-weight: 100 900;
    font-stretch: 62% 125%;
    font-style: normal;
  }
  @font-face {
    font-family: 'Zilla Slab';
    src: url('${FONTS.zillaReg}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Zilla Slab';
    src: url('${FONTS.zillaItalic}') format('woff2');
    font-weight: 400;
    font-style: italic;
  }
  @font-face {
    font-family: 'Zilla Slab';
    src: url('${FONTS.zillaSemi}') format('woff2');
    font-weight: 600;
    font-style: normal;
  }
  @font-face {
    font-family: 'Zilla Slab';
    src: url('${FONTS.zillaBold}') format('woff2');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    src: url('${FONTS.mono}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --paper: #fbf8f1;
    --surface: #fffdfa;
    --subtle: #e9e4da;
    --ink: #141211;
    --muted: #57544d;
    --border: #d9d4ca;
    --red: #b81d16;
    --ochre: #eec35a;
    --teal: #7fbdb5;
    --indigo: #363a5f;
    --sans: 'Archivo', 'Segoe UI', sans-serif;
    --serif: 'Zilla Slab', Georgia, serif;
    --mono: 'IBM Plex Mono', Consolas, monospace;
  }

  @page {
    size: 1080px 1350px;
    margin: 0;
  }

  html, body {
    width: 1080px;
    background: var(--paper);
    color: var(--ink);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: var(--serif);
  }

  .slide {
    width: 1080px;
    height: 1350px;
    padding: 50px 60px 44px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .slide:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .slide--paper { background: var(--paper); color: var(--ink); }
  .slide--ink { background: var(--ink); color: var(--paper); }
  .slide--red { background: var(--red); color: var(--paper); }
  .slide--indigo { background: var(--indigo); color: var(--paper); }

  .hdr {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 18px;
    border-bottom: 2px solid currentColor;
  }
  .slide--paper .hdr { border-bottom-color: var(--border); }
  .slide--ink .hdr { border-bottom-color: rgba(251, 248, 241, 0.2); }
  .slide--red .hdr, .slide--indigo .hdr { border-bottom-color: rgba(251, 248, 241, 0.28); }

  .logo {
    height: 36px;
    width: auto;
    display: block;
  }

  .eyebrow {
    font-family: var(--mono);
    font-size: 18px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .eyebrow-badge {
    padding: 5px 12px;
    font-size: 15px;
    border: 2px solid currentColor;
  }
  .slide--paper .eyebrow-badge--tech {
    background: var(--indigo);
    color: var(--paper);
    border-color: var(--ink);
  }

  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 26px 0 22px;
    gap: 20px;
  }

  .display {
    font-family: var(--sans);
    font-weight: 800;
    letter-spacing: -0.02em;
    word-spacing: 0.06em;
    line-height: 0.98;
  }
  .display--hero { font-size: 108px; line-height: 0.94; }
  .display--xl { font-size: 90px; line-height: 0.96; }
  .display--cta { font-size: 74px; line-height: 0.98; }
  .display--lg { font-size: 64px; line-height: 1.02; }

  .accent-red { color: var(--red); }
  .accent-ochre { color: var(--ochre); }

  .lead {
    font-family: var(--serif);
    font-size: 27px;
    line-height: 1.36;
    color: var(--muted);
  }
  .slide--ink .lead { color: rgba(251, 248, 241, 0.84); }
  .slide--red .lead, .slide--indigo .lead { color: rgba(251, 248, 241, 0.92); }

  .cover-headline {
    flex-shrink: 0;
    border-top: 3px solid var(--ink);
    padding-top: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .shot-frame {
    flex: 1;
    min-height: 0;
    position: relative;
    border: 3px solid var(--ink);
    background: var(--surface);
    box-shadow: 10px 10px 0 var(--ink);
    overflow: hidden;
  }
  .shot-frame img.shot {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .stamp {
    position: absolute;
    top: 22px;
    right: 22px;
    background: var(--red);
    color: var(--paper);
    border: 3px solid var(--ink);
    box-shadow: 5px 5px 0 var(--ink);
    padding: 12px 18px;
    font-family: var(--mono);
    font-size: 17px;
    line-height: 1.35;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    transform: rotate(-2deg);
    z-index: 4;
  }

  .inset-zoom {
    position: absolute;
    left: 22px;
    right: 22px;
    bottom: 20px;
    background: var(--surface);
    border: 3px solid var(--ink);
    box-shadow: 8px 8px 0 var(--red);
    padding: 16px 20px;
    z-index: 4;
  }
  .inset-zoom__tag {
    font-family: var(--mono);
    font-size: 14px;
    letter-spacing: 0.08em;
    color: var(--red);
    text-transform: uppercase;
    margin-bottom: 10px;
    display: block;
  }
  .inset-zoom img {
    width: 100%;
    height: auto;
    display: block;
    border: 2px solid var(--ink);
  }

  .pipe-sheet {
    flex: 1;
    min-height: 0;
    border: 3px solid var(--ink);
    background: var(--surface);
    box-shadow: 10px 10px 0 var(--indigo);
    padding: 36px 38px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
  }
  .pipe-kicker {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: var(--mono);
    font-size: 17px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--indigo);
  }
  .pipe-dot {
    width: 12px;
    height: 12px;
    background: var(--red);
    display: inline-block;
  }
  .pipe-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    border-top: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
    padding: 24px 0;
  }
  .pipe-stat__label {
    font-family: var(--mono);
    font-size: 15px;
    letter-spacing: 0.06em;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .pipe-stat__val {
    font-family: var(--sans);
    font-weight: 800;
    font-size: 34px;
    color: var(--ink);
    line-height: 1.08;
  }
  .pipe-flow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-family: var(--mono);
    font-size: 16px;
  }
  .pipe-node {
    flex: 1;
    border: 2px solid var(--ink);
    background: var(--paper);
    padding: 14px 12px;
    text-align: center;
  }
  .pipe-node--prod {
    background: var(--ink);
    color: var(--paper);
    font-weight: 700;
  }
  .pipe-note {
    background: var(--ink);
    color: var(--paper);
    padding: 18px 22px;
    font-family: var(--mono);
    font-size: 17px;
    line-height: 1.45;
  }

  .paper-card {
    flex-shrink: 0;
    background: var(--paper);
    color: var(--ink);
    border: 3px solid var(--ink);
    box-shadow: 10px 10px 0 var(--red);
    padding: 24px 32px;
  }
  .slide--paper .paper-card {
    box-shadow: 10px 10px 0 var(--ink);
  }

  .table-head {
    display: flex;
    justify-content: space-between;
    font-family: var(--mono);
    font-size: 16px;
    letter-spacing: 0.08em;
    color: var(--muted);
    text-transform: uppercase;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--ink);
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 0;
    border-bottom: 2px solid var(--border);
  }
  .row--spacious { padding: 30px 0; }
  .row:last-child { border-bottom: none; padding-bottom: 2px; }
  .row__left {
    display: flex;
    align-items: baseline;
    gap: 18px;
  }
  .row__num {
    font-family: var(--mono);
    font-size: 18px;
    color: var(--red);
    min-width: 28px;
  }
  .row__title {
    font-family: var(--serif);
    font-weight: 700;
    font-size: 28px;
    color: var(--ink);
  }
  .row__right {
    font-family: var(--mono);
    font-size: 19px;
    color: var(--ink);
    text-align: right;
  }

  .bars-card {
    background: var(--surface);
    border: 3px solid var(--ink);
    box-shadow: 10px 10px 0 var(--ink);
    padding: 38px 36px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .bar-row {
    display: grid;
    grid-template-columns: 270px 1fr 110px;
    align-items: center;
    gap: 18px;
  }
  .bar-label {
    font-family: var(--serif);
    font-weight: 700;
    font-size: 25px;
    color: var(--ink);
  }
  .bar-track {
    height: 32px;
    background: var(--subtle);
    border: 2px solid var(--ink);
    position: relative;
  }
  .bar-fill {
    height: 100%;
    background: var(--ink);
  }
  .bar-fill--best { background: var(--red); }
  .bar-val {
    font-family: var(--mono);
    font-size: 21px;
    text-align: right;
    color: var(--ink);
  }

  .callout-strip {
    flex-shrink: 0;
    border: 3px solid var(--ink);
    background: var(--subtle);
    padding: 18px 24px;
  }
  .slide--ink .callout-strip {
    background: #1f1c1a;
    border-color: rgba(251, 248, 241, 0.35);
    color: var(--paper);
  }
  .callout-strip__kicker {
    font-family: var(--mono);
    font-size: 15px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--red);
    margin-bottom: 6px;
  }
  .slide--ink .callout-strip__kicker { color: var(--ochre); }
  .callout-strip__text {
    font-family: var(--serif);
    font-size: 23px;
    line-height: 1.34;
  }

  .mech-flow {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .mech-step {
    border: 2px solid rgba(251, 248, 241, 0.32);
    background: #1e1b19;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mech-step__tag {
    font-family: var(--mono);
    font-size: 15px;
    letter-spacing: 0.08em;
    color: var(--ochre);
    text-transform: uppercase;
  }
  .mech-step__title {
    font-family: var(--sans);
    font-weight: 700;
    font-size: 23px;
    color: var(--paper);
    line-height: 1.15;
  }
  .mech-step__desc {
    font-family: var(--serif);
    font-size: 19px;
    color: rgba(251, 248, 241, 0.82);
    line-height: 1.32;
  }

  .scope-box {
    flex-shrink: 0;
    background: rgba(20, 18, 17, 0.24);
    border-left: 6px solid var(--ochre);
    padding: 20px 26px;
  }
  .scope-box__label {
    font-family: var(--mono);
    font-size: 15px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ochre);
    margin-bottom: 6px;
  }
  .scope-box__text {
    font-family: var(--serif);
    font-size: 25px;
    line-height: 1.34;
    color: var(--paper);
  }

  .close-box {
    flex-shrink: 0;
    background: var(--paper);
    color: var(--ink);
    border: 3px solid var(--ink);
    box-shadow: 12px 12px 0 var(--ink);
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .close-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    border-bottom: 2px solid var(--border);
    padding-bottom: 12px;
  }
  .close-kicker {
    font-family: var(--mono);
    font-size: 15px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--red);
  }
  .close-author {
    font-family: var(--mono);
    font-size: 15px;
    background: var(--subtle);
    border: 2px solid var(--ink);
    padding: 5px 12px;
    color: var(--ink);
  }
  .close-title {
    font-family: var(--sans);
    font-weight: 800;
    font-size: 32px;
    line-height: 1.14;
    letter-spacing: -0.015em;
  }
  .close-body {
    font-family: var(--serif);
    font-size: 23px;
    line-height: 1.34;
    color: var(--muted);
  }
  .close-links {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding-top: 12px;
    border-top: 2px solid var(--ink);
    font-family: var(--mono);
    font-size: 17px;
  }
  .close-link-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .close-pill {
    background: var(--ink);
    color: var(--paper);
    padding: 4px 10px;
    font-size: 14px;
    min-width: 112px;
    text-align: center;
    letter-spacing: 0.05em;
  }
  .close-pill--red { background: var(--red); }
  .close-pill--indigo { background: var(--indigo); }

  .ftr {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    border-top: 2px solid currentColor;
    font-family: var(--mono);
    font-size: 19px;
  }
  .slide--paper .ftr { border-top-color: var(--border); color: var(--muted); }
  .slide--ink .ftr { border-top-color: rgba(251, 248, 241, 0.22); color: rgba(251, 248, 241, 0.8); }
  .slide--red .ftr, .slide--indigo .ftr { border-top-color: rgba(251, 248, 241, 0.3); color: rgba(251, 248, 241, 0.92); }

  .page-pill {
    font-family: var(--mono);
    font-size: 18px;
    padding: 6px 14px;
    border: 2px solid currentColor;
    letter-spacing: 0.04em;
  }
  .slide--paper .page-pill {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }
`;

function headerHtml({ dark, label, badgeText }) {
  const logoSrc = dark ? LOGOS.inverse : LOGOS.ink;
  const badge = badgeText
    ? `<span class="eyebrow-badge ${dark ? '' : 'eyebrow-badge--tech'}">${esc(badgeText)}</span>`
    : '';
  return `
    <header class="hdr">
      <img class="logo" src="${logoSrc}" alt="ATLAS" />
      <div class="eyebrow">${badge}<span>${esc(label)}</span></div>
    </header>
  `;
}

function footerHtml({ left, pageNum }) {
  return `
    <footer class="ftr">
      <span>${esc(left)}</span>
      <span class="page-pill">${pageNum} de 4</span>
    </footer>
  `;
}

function slideShell({ theme, headerLabel, headerBadge, footerLeft, pageNum, bodyHtml }) {
  const dark = theme !== 'paper';
  return `
    <section class="slide slide--${theme}">
      ${headerHtml({ dark, label: headerLabel, badgeText: headerBadge })}
      <main class="body">
        ${bodyHtml}
      </main>
      ${footerHtml({ left: footerLeft, pageNum })}
    </section>
  `;
}

function renderCoverVisual(post) {
  if (post.cover.kind === 'pipeline') {
    const c = post.cover;
    return `
      <div class="pipe-sheet">
        <div class="pipe-kicker"><span class="pipe-dot"></span><span>${esc(c.kicker)}</span></div>
        <div style="font-family: var(--serif); font-size: 32px; line-height: 1.32; color: var(--ink); font-weight: 600;">
          ${esc(c.summary)}
        </div>
        <div class="pipe-grid">
          ${c.stats
            .map(
              (s) => `
            <div>
              <div class="pipe-stat__label">${esc(s.label)}</div>
              <div class="pipe-stat__val">${esc(s.value)}</div>
            </div>`,
            )
            .join('')}
        </div>
        <div class="pipe-flow">
          ${c.flow
            .map(
              (n, i) => `
            <div class="pipe-node ${i === c.flow.length - 1 ? 'pipe-node--prod' : ''}">${esc(n)}</div>`,
            )
            .join('')}
        </div>
        <div class="pipe-note">${esc(c.note)}</div>
      </div>
    `;
  }

  const c = post.cover;
  const inset = c.insetImage
    ? `
      <div class="inset-zoom">
        <span class="inset-zoom__tag">${esc(c.insetLabel)}</span>
        <img src="${c.insetImage}" alt="" />
      </div>`
    : '';
  const stamp = c.stamp ? `<div class="stamp">${c.stamp.map(esc).join('<br>')}</div>` : '';

  return `
    <div class="shot-frame">
      <img class="shot" src="${c.image}" style="object-position: ${c.pos ?? 'center top'};" alt="" />
      ${stamp}
      ${inset}
    </div>
  `;
}

function renderSlide1(post) {
  const c = post.cover;
  const bodyHtml = `
    ${renderCoverVisual(post)}
    <div class="cover-headline">
      <h1 class="display ${c.heroSize ?? 'display--hero'}">
        ${esc(c.titleBefore)}<span class="accent-red">${esc(c.titleRed)}</span>
      </h1>
      <p class="lead">${esc(c.subtitle)}</p>
    </div>
  `;
  return slideShell({
    theme: 'paper',
    headerLabel: post.headerLabel,
    headerBadge: post.headerBadge,
    footerLeft: post.footerCover,
    pageNum: 1,
    bodyHtml,
  });
}

function renderSlide2(post) {
  const e = post.evidence;
  let middle = '';

  if (e.kind === 'screenshot') {
    middle = `
      <div class="shot-frame">
        <img class="shot" src="${e.image}" style="object-position: ${e.pos ?? 'center top'};" alt="" />
      </div>
      <div class="callout-strip">
        <div class="callout-strip__kicker">${esc(e.noteKicker)}</div>
        <div class="callout-strip__text">${esc(e.noteText)}</div>
      </div>
    `;
  } else if (e.kind === 'bars') {
    middle = `
      <div class="bars-card">
        <div class="table-head"><span>MÉTODO DE RECUPERAÇÃO</span><span>RECALL@10</span></div>
        ${e.bars
          .map(
            (b) => `
          <div class="bar-row">
            <div class="bar-label">${esc(b.label)}</div>
            <div class="bar-track"><div class="bar-fill ${b.best ? 'bar-fill--best' : ''}" style="width: ${b.pct}%;"></div></div>
            <div class="bar-val">${esc(b.value)}</div>
          </div>`,
          )
          .join('')}
      </div>
      <div class="callout-strip">
        <div class="callout-strip__kicker">${esc(e.noteKicker)}</div>
        <div class="callout-strip__text">${esc(e.noteText)}</div>
      </div>
    `;
  } else if (e.kind === 'table') {
    middle = `
      <div class="paper-card">
        <div class="table-head"><span>${esc(e.colA)}</span><span>${esc(e.colB)}</span></div>
        ${e.rows
          .map(
            (r, idx) => `
          <div class="row row--spacious">
            <div class="row__left">
              <span class="row__num">${String(idx + 1).padStart(2, '0')}</span>
              <span class="row__title">${esc(r.title)}</span>
            </div>
            <span class="row__right">${esc(r.right)}</span>
          </div>`,
          )
          .join('')}
      </div>
      <div class="callout-strip">
        <div class="callout-strip__kicker">${esc(e.noteKicker)}</div>
        <div class="callout-strip__text">${esc(e.noteText)}</div>
      </div>
    `;
  } else if (e.kind === 'slider') {
    middle = `
      <div class="paper-card" style="padding: 30px 32px;">
        <div class="table-head" style="margin-bottom: 22px;"><span>COMPONENTE REAL</span><span>CONTROLE 50% – 1200%</span></div>
        <img src="${e.image}" style="width: 100%; border: 2px solid var(--ink); display: block;" alt="" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="paper-card" style="padding: 28px; box-shadow: 8px 8px 0 var(--ink);">
          <div class="callout-strip__kicker">ANTES (INPUT DIRETO)</div>
          <div style="font-family: var(--serif); font-size: 25px; line-height: 1.38;">
            Cada pixel movido no range recalculava 1.318 nós e 2.775 arestas fora de .stage--busy.
          </div>
        </div>
        <div class="paper-card" style="padding: 28px; box-shadow: 8px 8px 0 var(--red);">
          <div class="callout-strip__kicker">DEPOIS (RAF + BUSY)</div>
          <div style="font-family: var(--serif); font-size: 25px; line-height: 1.38;">
            Um update por quadro durante o arraste, GPU em translate3d e assentamento exato no change.
          </div>
        </div>
      </div>
    `;
  }

  const subtitleHtml = e.subtitle
    ? `<p class="lead" style="margin-top: 12px;">${esc(e.subtitle)}</p>`
    : '';
  const bodyHtml = `
    <div style="flex-shrink: 0;">
      <h2 class="display display--lg">
        ${esc(e.titleBefore)}<span class="accent-red">${esc(e.titleRed)}</span>${esc(e.titleAfter ?? '')}
      </h2>
      ${subtitleHtml}
    </div>
    ${middle}
  `;

  return slideShell({
    theme: 'paper',
    headerLabel: post.headerLabel,
    headerBadge: post.headerBadge,
    footerLeft: e.footer,
    pageNum: 2,
    bodyHtml,
  });
}

function renderSlide3(post) {
  const m = post.mechanics;
  const bodyHtml = `
    <div style="flex-shrink: 0;">
      <h2 class="display display--lg">
        ${esc(m.titleBefore)}<span class="accent-ochre">${esc(m.titleOchre)}</span>
      </h2>
    </div>
    <div class="paper-card">
      <div class="table-head"><span>${esc(m.colA)}</span><span>${esc(m.colB)}</span></div>
      ${m.rows
        .map(
          (r, idx) => `
        <div class="row">
          <div class="row__left">
            <span class="row__num">${String(idx + 1).padStart(2, '0')}</span>
            <span class="row__title">${esc(r.left)}</span>
          </div>
          <span class="row__right">${esc(r.right)}</span>
        </div>`,
        )
        .join('')}
    </div>
    <div class="mech-flow">
      ${m.steps
        .map(
          (s, idx) => `
        <div class="mech-step">
          <div class="mech-step__tag">ETAPA ${idx + 1}</div>
          <div class="mech-step__title">${esc(s.title)}</div>
          <div class="mech-step__desc">${esc(s.desc)}</div>
        </div>`,
        )
        .join('')}
    </div>
    <div class="callout-strip">
      <div class="callout-strip__kicker">${esc(m.takeawayKicker)}</div>
      <div class="callout-strip__text">${esc(m.takeaway)}</div>
    </div>
  `;

  return slideShell({
    theme: 'ink',
    headerLabel: post.headerLabel,
    headerBadge: post.headerBadge,
    footerLeft: m.footer,
    pageNum: 3,
    bodyHtml,
  });
}

function renderSlide4(post) {
  const c = post.cta;
  const theme = post.ctaTheme ?? 'red';
  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <h2 class="display display--cta">
        ${esc(c.titleBefore)}<span class="accent-ochre">${esc(c.titleOchre)}</span>
      </h2>
      <p class="lead">${esc(c.subtitle)}</p>
    </div>

    <div class="scope-box">
      <div class="scope-box__label">TRANSPARÊNCIA E ESCOPO</div>
      <div class="scope-box__text">${esc(c.scope)}</div>
    </div>

    <div class="close-box">
      <div class="close-top">
        <span class="close-kicker">PROJETO EM PRODUÇÃO · OPEN SOURCE</span>
        <span class="close-author">Enzo Bellussi · Software Engineer</span>
      </div>
      <div class="close-title">${esc(c.cardTitle)}</div>
      <p class="close-body">${esc(c.cardBody)}</p>
      <div class="close-links">
        <div class="close-link-row">
          <span class="close-pill close-pill--red">PRODUÇÃO</span>
          <span>${esc(c.prodUrl)}</span>
        </div>
        <div class="close-link-row">
          <span class="close-pill">GITHUB</span>
          <span>${esc(c.githubUrl)}</span>
        </div>
        <div class="close-link-row">
          <span class="close-pill close-pill--indigo">PORTFÓLIO</span>
          <span>bellussi.vercel.app</span>
        </div>
      </div>
    </div>
  `;

  return slideShell({
    theme,
    headerLabel: post.headerLabel,
    headerBadge: post.headerBadge,
    footerLeft: c.footer,
    pageNum: 4,
    bodyHtml,
  });
}

const POSTS = [
  {
    dir: '01-itinerarios',
    headerLabel: 'NOTAS DE CONSTRUÇÃO · #01',
    footerCover: 'atlas-bellussi.pages.dev/itinerarios/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.itinerario,
      pos: 'center 2%',
      stamp: ['4 TIPOS', '6 PARADAS'],
      titleBefore: '9 ',
      titleRed: 'percursos.',
      subtitle: 'Uma pergunta histórica vira trilha conectada entre leituras, verbetes e grafo.',
    },
    evidence: {
      kind: 'screenshot',
      titleBefore: 'Uma pergunta vira ',
      titleRed: 'caminho.',
      image: ASSETS.itinerario,
      pos: 'center 56%',
      noteKicker: 'TRABALHISMO E ESTADO SOCIAL',
      noteText: '6 paradas principais + 2 ramos opcionais que convergem de volta para a trilha.',
      footer: 'Itinerário · mapa SVG interativo',
    },
    mechanics: {
      titleBefore: 'Quatro tipos de ',
      titleOchre: 'percurso.',
      colA: 'TIPO',
      colB: 'FUNÇÃO',
      rows: [
        { left: 'Histórico', right: 'processo no tempo' },
        { left: 'Comparativo', right: 'duas tradições' },
        { left: 'Conceitual', right: 'usos de um conceito' },
        { left: 'Institucional', right: 'regras e rupturas' },
      ],
      steps: [
        { title: '1. Modelo local', desc: 'Propõe paradas e justificativas sobre o grafo real.' },
        { title: '2. Validação dura', desc: 'Bloqueia slug, leitura ou sourceId inexistente.' },
        { title: '3. Selo explícito', desc: 'Exibe conferência de IA e fonte em cada parada.' },
      ],
      takeawayKicker: 'CONTRATO EDITORIAL',
      takeaway: 'O gerador nunca cria entidade nem fonte fora do release compilado.',
      footer: 'Validador determinístico · 9 percursos no ar',
    },
    cta: {
      titleBefore: '9 percursos ',
      titleOchre: 'prontos no ar.',
      subtitle:
        'Estruturados em Angular e validados no build para estudar história sem se perder em dezenas de abas.',
      scope:
        'Conferência inicial feita com IA local e selo explícito no topo; revisão humana das fontes aberta na issue #92.',
      cardTitle: 'Explore as trilhas e confira as fontes de Trabalhismo',
      cardBody:
        'Cada parada (~1 h para o lote de 6) traz trecho citado, vizinhos do grafo e bibliografia verificada.',
      prodUrl: 'atlas-bellussi.pages.dev/itinerarios/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/92',
      footer: 'Post 01 · campanha itinerarios',
    },
  },
  {
    dir: '02-leituras',
    headerLabel: 'NOTAS DE CONSTRUÇÃO · #02',
    footerCover: 'atlas-bellussi.pages.dev/leituras/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.leituraTop,
      pos: 'center 2%',
      stamp: ['6 LEITURAS', '72 CAPÍTULOS'],
      titleBefore: '12 ',
      titleRed: 'capítulos.',
      subtitle: 'Engine única em Angular com fonte ao lado, caso brasileiro e divergências.',
    },
    evidence: {
      kind: 'screenshot',
      titleBefore: 'A fonte fica ',
      titleRed: 'ao lado.',
      image: ASSETS.leitura,
      pos: 'center 28%',
      noteKicker: 'MARXISMO · CAPÍTULO E REVISÃO',
      noteText: 'Termos sublinhados abrem fichas no diálogo sem tirar a pessoa da leitura.',
      footer: 'Leitura contínua · /leitura/marxismo/',
    },
    mechanics: {
      titleBefore: 'Quatro marcas ',
      titleOchre: 'por frase.',
      colA: 'CLASSIFICAÇÃO',
      colB: 'USO NO TEXTO',
      rows: [
        { left: 'Fato documentado', right: 'evento, obra e data' },
        { left: 'Interpretação', right: 'leitura com autoria' },
        { left: 'Controvérsia', right: 'disputa entre correntes' },
        { left: 'Lacuna aberta', right: 'ponto em revisão' },
      ],
      steps: [
        { title: '1. Entender (1–4)', desc: 'Definição, contexto histórico e perguntas centrais.' },
        { title: '2. Situar (5–8)', desc: 'Épocas, vertentes, divergências e geografia.' },
        { title: '3. Avaliar (9–12)', desc: 'Críticas, acervo conectado e bibliografia.' },
      ],
      takeawayKicker: 'DOSSIÊS EM PRODUÇÃO',
      takeaway:
        '6 leituras públicas (72 capítulos pré-renderizados) ligadas direto aos verbetes e ao grafo.',
      footer: 'Padrão V4 · 12 capítulos canônicos',
    },
    cta: {
      titleBefore: '72 capítulos com ',
      titleOchre: 'fonte ao lado.',
      subtitle:
        'Navegação rápida por âncoras, foco em teclado e síntese interativa sem perder o contexto.',
      scope:
        'Trechos assistidos por IA trazem selo editorial explícito enquanto a revisão humana segue capítulo a capítulo.',
      cardTitle: 'Leia uma tradição contínua ou revise um capítulo (#92)',
      cardBody:
        'Escolha Marxismo ou Liberalismo, teste as fichas contextuais e aponte qualquer fonte fraca.',
      prodUrl: 'atlas-bellussi.pages.dev/leituras/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/92',
      footer: 'Post 02 · campanha leituras',
    },
  },
  {
    dir: '03-grafos',
    headerLabel: 'NOTAS DE CONSTRUÇÃO · #03',
    footerCover: 'atlas-bellussi.pages.dev/grafos/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.grafoLocal,
      pos: '88% 48%',
      stamp: ['1.318 NÓS', '2.775 LIGAÇÕES'],
      titleBefore: '2.775 ',
      titleRed: 'ligações.',
      subtitle: 'Dijkstra ponderado por peso histórico e escala em GPU durante arrasto e zoom.',
    },
    evidence: {
      kind: 'screenshot',
      titleBefore: 'Toda aresta tem ',
      titleRed: 'peso.',
      image: ASSETS.grafoDetalhe,
      pos: 'center 8%',
      noteKicker: 'GRAFO · LIBERALISMO, 22 CONEXÕES',
      noteText: 'Conexões históricas e de ação aparecem antes de vínculos genéricos de catálogo.',
      footer: 'Grafo · painel lateral de conexões',
    },
    mechanics: {
      titleBefore: 'Caminho mínimo, ',
      titleOchre: 'não mais curto.',
      colA: 'PESO DA ARESTA',
      colB: 'EXEMPLOS',
      rows: [
        { left: 'Histórico', right: 'influência e ruptura' },
        { left: 'Ação', right: 'fundou, participou' },
        { left: 'Administrativo', right: 'sede e sucessão' },
        { left: 'Catálogo', right: 'contexto, não causalidade' },
      ],
      steps: [
        {
          title: '1. Dijkstra ponderado',
          desc: 'Caminhos seguem pessoas e obras antes de países.',
        },
        { title: '2. .stage--busy', desc: 'Desliga non-scaling-stroke e halos no movimento.' },
        { title: '3. Mundo em GPU', desc: 'translate3d escala rápido; rótulos só no repouso.' },
      ],
      takeawayKicker: 'VALIDADO EM DESKTOP E MOBILE',
      takeaway:
        'Testado a 60 fps no desktop e no meu celular Android, com alternância para lista acessível no mobile.',
      footer: 'Dijkstra ponderado + SVG em GPU',
    },
    cta: {
      titleBefore: '60 fps no desktop e ',
      titleOchre: 'no Android.',
      subtitle:
        'Relações pesadas semanticamente e mapa SVG responsivo com modo rápido e vista em lista.',
      scope:
        'Validado em desktop e no meu Android; feedback em iOS/Safari e telas variadas segue aberto na issue #93.',
      cardTitle: 'Navegue pelo grafo em produção ou conte como rodou no seu aparelho',
      cardBody:
        'Trace rotas históricas entre verbetes e teste toque, pinça, zoom e painel de conexões.',
      prodUrl: 'atlas-bellussi.pages.dev/grafos/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/93',
      footer: 'Post 03 · campanha grafos',
    },
  },
  {
    dir: '04-dados',
    headerLabel: 'NOTAS DE CONSTRUÇÃO · #04',
    footerCover: 'atlas-bellussi.pages.dev/acervo/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.karlMarx,
      pos: 'center top',
      stamp: ['928 QIDS', '448 DATAS'],
      titleBefore: '+648 ',
      titleRed: 'relações.',
      subtitle: 'Reconciliação pelo QID do Wikidata filtrando ruído semântico e alvos órfãos.',
    },
    evidence: {
      kind: 'screenshot',
      titleBefore: '36 conexões em ',
      titleRed: 'Karl Marx.',
      image: ASSETS.karlMarx,
      pos: 'center bottom',
      noteKicker: 'PROVENIÊNCIA NO VERBETE',
      noteText: 'Cada bloco distingue revisão da Wikipédia, descrição CC0 do Wikidata e contexto.',
      footer: 'Verbete · fontes e vínculos separados',
    },
    mechanics: {
      titleBefore: 'O que entrou e o que ',
      titleOchre: 'ficou fora.',
      colA: 'PROPRIEDADE / REGRA',
      colB: 'DECISÃO NO FILTRO',
      rows: [
        { left: 'P800 (obra notável)', right: 'invertido para criador -> obra' },
        { left: 'P276 (localização)', right: '22 conceitos/obras removidos' },
        { left: 'P361 (parte de)', right: 'descartado por ruído amplo' },
        { left: 'Alvos externos', right: '4.036 fora do grafo' },
      ],
      steps: [
        {
          title: '1. Pontas fechadas',
          desc: 'Só entra aresta se os dois lados já estão no acervo.',
        },
        { title: '2. Precisão temporal', desc: 'Datas entram apenas com precisão mínima de ano.' },
        { title: '3. Rótulo honesto', desc: 'P1142 e P737 viram associação de catálogo.' },
      ],
      takeawayKicker: 'CONTRASTE COM IMPORTAÇÃO CRUA',
      takeaway:
        '4.036 alvos externos barrados automaticamente para manter o grafo fechado e coerente.',
      footer: 'Wikidata · reconciliação conservadora',
    },
    cta: {
      titleBefore: 'Dados abertos sem ',
      titleOchre: 'ruído órfão.',
      subtitle:
        'Pipeline próprio corrige inversões semânticas e protege o grafo antes de entrar no build.',
      scope:
        'Vínculos de catálogo entram rotulados em grupo próprio, separados das relações com citação direta.',
      cardTitle: 'Explore o acervo filtrado e ajude na auditoria de registros (#94)',
      cardBody: 'Compare conexões estruturadas com as fontes citadas em cada ficha do acervo.',
      prodUrl: 'atlas-bellussi.pages.dev/acervo/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/94',
      footer: 'Post 04 · campanha dados-abertos',
    },
  },
  {
    dir: '05-proveniencia',
    headerLabel: 'NOTAS DE CONSTRUÇÃO · #05',
    footerCover: 'atlas-bellussi.pages.dev/acervo/fontes/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.fontes,
      pos: 'center 76%',
      stamp: ['SHA-256', 'CC BY-SA 4.0'],
      titleBefore: '1.481 ',
      titleRed: 'fontes.',
      subtitle: 'Objetos imutáveis no R2, contrato Zod no build e licença declarada por mídia.',
    },
    evidence: {
      kind: 'screenshot',
      titleBefore: 'Licença e origem na ',
      titleRed: 'ficha.',
      image: ASSETS.fontes,
      pos: 'center 82%',
      noteKicker: 'CATÁLOGO /ACERVO/FONTES/',
      noteText:
        'Cada referência exibe número de revisão, licença de texto e quantos registros a citam.',
      footer: '1.320 entidades · 2.778 relações · 1.481 fontes',
    },
    mechanics: {
      titleBefore: 'Hash antes de ',
      titleOchre: 'publicar.',
      colA: 'CAMADA',
      colB: 'GARANTIA',
      rows: [
        { left: 'Cloudflare R2', right: 'objetos c/<sha256>.json' },
        { left: 'pointer.json', right: 'único ponteiro mutável' },
        { left: 'content:fetch', right: 'confere tamanho e SHA-256' },
        { left: 'Imagens Wikimedia', right: 'só entra licença compatível' },
      ],
      steps: [
        { title: '1. Frase na relação', desc: 'Relações documentadas guardam a citação de apoio.' },
        { title: '2. Bloqueio no build', desc: 'Divergência de hash ou schema Zod para o deploy.' },
        {
          title: '3. Mídia separada',
          desc: 'Autor, origem e licença ficam visíveis sob a imagem.',
        },
      ],
      takeawayKicker: 'RASTREABILIDADE PONTA A PONTA',
      takeaway: 'Qualquer erro de integridade criptográfica ou schema bloqueia a publicação no CI.',
      footer: 'R2 imutável + verificação de integridade',
    },
    cta: {
      titleBefore: 'Integridade por ',
      titleOchre: 'hash SHA-256.',
      subtitle:
        'Arquitetura de conteúdo imutável garante que nenhum texto ou imagem apareça sem origem registrada.',
      scope:
        'Atribuições importadas permanecem abertas para auditoria contínua de créditos e licenças na issue #94.',
      cardTitle: 'Inspecione o catálogo de fontes ou audite 20 imagens (#94)',
      cardBody:
        'Verifique revisões, licenças CC BY-SA/domínio público e links originais publicados no ar.',
      prodUrl: 'atlas-bellussi.pages.dev/acervo/fontes/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/94',
      footer: 'Post 05 · campanha proveniencia',
    },
  },
  {
    dir: '06-ia-local',
    headerLabel: 'IA LOCAL NO BUILD · #06',
    headerBadge: 'US$ 0 EM NUVEM',
    footerCover: 'atlas-bellussi.pages.dev · pipeline local',
    ctaTheme: 'indigo',
    cover: {
      kind: 'pipeline',
      kicker: 'PIPELINE LOCAL NO BUILD · SEM LLM REMOTO POR VISITA',
      summary:
        'Mineração de relações em GPU própria (RTX 4060) alimenta o acervo estático em produção com custo zero de API.',
      stats: [
        { label: 'HARDWARE', value: 'RTX 4060 8GB' },
        { label: 'MODELOS', value: 'qwen3 / gemma2' },
        { label: 'CUSTO NUVEM', value: 'US$ 0,00' },
      ],
      flow: ['Artigo fonte', 'Ollama local', 'Trava literal', 'Build em produção'],
      note: 'O site público roda 100% estático porque toda extração e validação acontecem antes do deploy.',
      titleBefore: 'US$ ',
      titleRed: '0,00.',
      subtitle: 'Mesmo recorte de 20 artigos com trava de citação literal e IDs do grafo.',
    },
    evidence: {
      kind: 'table',
      titleBefore: 'Mesma amostra, ',
      titleRed: 'outro custo.',
      subtitle: 'Benchmark controlado em 20 artigos com verificação estrita de citação literal.',
      colA: 'EXECUÇÃO TESTADA',
      colB: 'ACEITAS · CUSTO',
      rows: [
        { title: 'Piloto API paga (3 tradições)', right: 'base · US$ 0,540' },
        { title: 'qwen3:8b local (20 artigos)', right: '9 aceitas · US$ 0,00' },
        { title: 'claude-haiku-low (20 artigos)', right: '7 aceitas · US$ 0,0296' },
        { title: 'gemma2:9b local (20 artigos)', right: '5 aceitas · US$ 0,00' },
      ],
      noteKicker: 'BENCHMARK EM PRODUÇÃO (MASTER)',
      noteText:
        'qwen3:8b superou o modo econômico da API em recall literal mantendo custo zero em nuvem.',
      footer: 'Benchmark local · scripts/tradicao + experiments/rag',
    },
    mechanics: {
      titleBefore: 'Tarefa estreita, ',
      titleOchre: 'trava dura.',
      colA: 'VERIFICAÇÃO AUTOMÁTICA',
      colB: 'SE FALHAR',
      rows: [
        { left: 'Cópia literal da passagem', right: 'descarta na hora' },
        { left: 'IDs existentes no grafo', right: 'bloqueia entidade nova' },
        { left: 'Embeddings bge-m3', right: 'filtra candidatos antes' },
        { left: 'Selo obrigatório', right: '[conferência de IA]' },
      ],
      steps: [
        { title: '1. Escopo curto', desc: 'Modelo só localiza passagem e copia a frase exata.' },
        { title: '2. Zero invenção', desc: 'Qualquer palavra alterada na citação reprova o item.' },
        { title: '3. Publicação segura', desc: 'Só o que passa nos guardas entra no release.' },
      ],
      takeawayKicker: 'ONDE MODELO MENOR ERRA MAIS',
      takeaway: 'Ironia e contexto implícito seguem exigindo revisão humana após a triagem local.',
      footer: 'Travas determinísticas · guards.mjs',
    },
    cta: {
      titleBefore: 'IA local no build, ',
      titleOchre: 'custo zero no ar.',
      subtitle:
        'Site estático rápido para quem visita e pipeline inteligente rodando localmente antes do deploy.',
      scope:
        'Toda relação extraída localmente carrega marcação de IA para manter transparência até a revisão humana.',
      cardTitle: 'Veja o ATLAS no ar e leia o benchmark dos 20 artigos',
      cardBody: 'Metodologia, prompts e comparações de modelo abertos na íntegra no repositório.',
      prodUrl: 'atlas-bellussi.pages.dev/',
      githubUrl: 'github.com/.../RAG-BENCHMARK-EXTRATOR-LOCAL-20-ARTIGOS.md',
      footer: 'Post 06 · campanha ia-local',
    },
  },
  {
    dir: '07-rag',
    headerLabel: 'ENGENHARIA DE BUSCA · #07',
    headerBadge: 'ADR-001',
    footerCover: 'atlas-bellussi.pages.dev · busca em produção',
    ctaTheme: 'indigo',
    cover: {
      kind: 'pipeline',
      kicker: 'BENCHMARK DE RECUPERAÇÃO · DECISÃO APLICADA NO AR',
      summary:
        'Avaliei busca lexical, BM25, bge-m3, reranker e expansão no grafo para decidir a arquitetura em produção.',
      stats: [
        { label: 'PERGUNTAS', value: '86 (dev+test)' },
        { label: 'MULTI-HOP', value: '0,8056 R@10' },
        { label: 'INJEÇÕES', value: '8/8 bloqueadas' },
      ],
      flow: ['Benchmark Python', 'BM25 = 0,7442', 'ADR-001', 'BM25 no Angular'],
      note: 'Sem servidor remoto de LLM: o estudo guiou a adoção do BM25 direto no navegador.',
      heroSize: 'display--xl',
      titleBefore: '0,8663 ',
      titleRed: 'R@10.',
      subtitle: 'Medição rigorosa antes de escolher manter o runtime público 100% estático.',
    },
    evidence: {
      kind: 'bars',
      titleBefore: 'Recall@10 por ',
      titleRed: 'método.',
      subtitle:
        '86 perguntas sobre 11.145 afirmações; busca lexical estrita zerava em perguntas abertas.',
      bars: [
        { label: 'Lexical estrita', pct: 3, value: '0,0000' },
        { label: 'BM25 (afirmações)', pct: 74.4, value: '0,7442' },
        { label: 'Densa (bge-m3)', pct: 81.4, value: '0,8140' },
        { label: 'Híbrida + reranker', pct: 84.9, value: '0,8488' },
        { label: 'Híbrida + grafo', pct: 86.6, value: '0,8663', best: true },
      ],
      noteKicker: 'GANHO EM MÚLTIPLOS SALTOS',
      noteText:
        'Expandir vizinhos editoriais do grafo levou perguntas multi-hop de 0,6667 para 0,8056.',
      footer: '86 perguntas · 11.145 afirmações indexadas',
    },
    mechanics: {
      titleBefore: 'Por que escolhi ',
      titleOchre: 'BM25 no ar.',
      colA: 'CRITÉRIO',
      colB: 'DECISÃO DO ADR-001',
      rows: [
        { left: 'Arquitetura static-first', right: 'zero backend nem API no request' },
        { left: 'Custo e chave secreta', right: 'gratuito e aberto sem proxy' },
        { left: 'Fidelidade política', right: 'evita síntese alucinada ao vivo' },
        { left: 'Ganho em produção', right: 'BM25 sem stop words no cliente' },
      ],
      steps: [
        { title: '1. Extrativo 1,0000', desc: 'Fidelidade total quando copia e cita o acervo.' },
        { title: '2. Defesa 8/8', desc: 'Guardas bloquearam todas as injeções testadas.' },
        { title: '3. Código enxuto', desc: 'Solução que roda no navegador em milissegundos.' },
      ],
      takeawayKicker: 'DECISÃO ORIENTADA A DADOS',
      takeaway:
        'O benchmark mostrou o salto de 0,0000 para 0,7442 já no BM25 sem precisar de GPU em nuvem.',
      footer: 'ADR-001 · busca semântica e RAG',
    },
    cta: {
      titleBefore: 'Busca guiada ',
      titleOchre: 'por benchmark.',
      subtitle:
        'Medir primeiro evitou acoplar chat caro e trouxe ganho imediato para a busca no cliente Angular.',
      scope:
        'As 100 perguntas de avaliação (dev/test) aguardam calibração humana dos rótulos na issue #95.',
      cardTitle: 'Teste a busca no site ou ajude a rotular 30 perguntas (#95)',
      cardBody:
        'Leia pergunta e resposta esperada em questions.jsonl e registre human_ok com nota curta.',
      prodUrl: 'atlas-bellussi.pages.dev/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/95',
      footer: 'Post 07 · campanha rag',
    },
  },
  {
    dir: '08-estatico',
    headerLabel: 'NOTAS DE CONSTRUÇÃO · #08',
    footerCover: 'atlas-bellussi.pages.dev/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.home,
      pos: 'center top',
      stamp: ['1.260+ ROTAS', 'SEM BANCO'],
      heroSize: 'display--xl',
      titleBefore: '2 ',
      titleRed: 'requisições.',
      subtitle:
        'Após bater 186 mil req/dia no Worker, redesenhei o delivery para ponteiro + pacote.',
    },
    evidence: {
      kind: 'table',
      titleBefore: 'A página chega ',
      titleRed: 'pronta.',
      subtitle: 'O navegador baixa objetos imutáveis por hash SHA-256 apenas quando precisa.',
      colA: 'ROTA / CARGA',
      colB: 'OBJETOS · PESO',
      rows: [
        { title: 'Home (/)', right: '0 req conteúdo · JSON no build' },
        { title: 'Leitura direta', right: '1 req · pointer no prerender' },
        { title: 'SPA -> Acervo / Leitura', right: '2 req · ~3,3 MB Brotli (35,1 MB)' },
        { title: 'Grafo (/grafos/)', right: '2 req · só o networkBundle' },
      ],
      noteKicker: 'GANHO DE ESCALA NO CLOUDFLARE',
      noteText: 'Cada navegação caiu de ~17 JSONs para no máximo 2; na mesma sessão cai para zero.',
      footer: 'Cloudflare Pages + R2 imutável',
    },
    mechanics: {
      titleBefore: 'Dois objetos, ',
      titleOchre: 'nenhum banco.',
      colA: 'ARTEFATO',
      colB: 'PAPEL NO CARREGAMENTO',
      rows: [
        { left: 'HTML estático', right: '1.260+ rotas prerenderizadas' },
        { left: 'pointer.json', right: 'aponta o release e os hashes' },
        { left: 'bundle', right: 'grafo, busca, leituras e layouts' },
        { left: 'networkBundle', right: 'só o grafo + posições prontas' },
      ],
      steps: [
        { title: '1. Zero servidor', desc: 'Sem banco em execução nem custo por query.' },
        { title: '2. TransferState', desc: 'Evita baixar na hidratação o que veio do SSR.' },
        { title: '3. Memória cacheada', desc: 'Depois da primeira carga, verbetes custam 0 req.' },
      ],
      takeawayKicker: 'PRÓXIMA EVOLUÇÃO MAPEADA',
      takeaway:
        'Fatiar o bundle por catálogo mantendo verificação SHA-256 reduzirá os 35,1 MB em memória.',
      footer: 'Arquitetura static-first · content-repository',
    },
    cta: {
      titleBefore: '1.263 páginas ',
      titleOchre: 'sem banco no ar.',
      subtitle:
        'Prerender em Angular + objetos imutáveis no R2 mantêm uma enciclopédia inteira gratuita e rápida.',
      scope:
        'Com Brotli trafega ~3,3 MB na rede; fatiar o pacote de 35,1 MB por rota já está aberto na issue #96.',
      cardTitle: 'Navegue em produção ou discuta a divisão por rota (#96)',
      cardBody:
        'Analise pointer.json, build-content e ContentRepository com verificação criptográfica.',
      prodUrl: 'atlas-bellussi.pages.dev/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/96',
      footer: 'Post 08 · campanha estatico',
    },
  },
  {
    dir: '09-slider',
    headerLabel: 'NOTAS DE CONSTRUÇÃO · #09',
    footerCover: 'atlas-bellussi.pages.dev/grafos/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.grafoLocal,
      pos: '88% 66%',
      stamp: ['50% – 1200%', 'RAF + BUSY'],
      insetImage: ASSETS.zoomBar,
      insetLabel: 'BARRA DE ZOOM REAL DO GRAFO · SLIDER UNIFICADO',
      titleBefore: '1 ',
      titleRed: 'frame.',
      subtitle: 'O slider de zoom agora compartilha o mesmo modo rápido da roda, pinça e arrasto.',
    },
    evidence: {
      kind: 'slider',
      titleBefore: 'O slider era a ',
      titleRed: 'exceção.',
      subtitle: 'Roda e arrasto entravam em .stage--busy; o input range ficava fora e travava.',
      image: ASSETS.zoomBar,
      footer: 'KnowledgeNetworkComponent · zoom 50% a 1200%',
    },
    mechanics: {
      titleBefore: 'rAF + busy + ',
      titleOchre: 'settle no change.',
      colA: 'ETAPA DO GESTO',
      colB: 'COMPORTAMENTO',
      rows: [
        { left: 'input no slider', right: 'ativa busy + agenda 1 rAF' },
        { left: 'Em movimento', right: 'só escala camada em GPU' },
        { left: 'Ignorado no arraste', right: 'culling e colisão de rótulos' },
        { left: 'Evento change', right: 'aplica valor exato e redesenha' },
      ],
      steps: [
        { title: '1. Causa real', desc: 'non-scaling-stroke em 1.318 nós travava o Chromium.' },
        { title: '2. Mesmo contrato', desc: 'Roda, pinça, pan e slider usam .stage--busy.' },
        { title: '3. Sem thrashing', desc: 'Um frame por atualização, nunca dezenas em fila.' },
      ],
      takeawayKicker: 'RESULTADO EM DESKTOP E ANDROID',
      takeaway:
        'Deslize contínuo de 50% a 1200% no desktop e no meu Android, com nitidez instantânea ao soltar.',
      footer: 'Performance SVG · zoom unificado',
    },
    cta: {
      titleBefore: 'Zoom contínuo de ',
      titleOchre: '50% a 1200%.',
      subtitle:
        'Sincronizar eventos input, requestAnimationFrame e GPU eliminou o engasgo no controle de escala.',
      scope:
        'Validado em desktop e no meu Android; medições de INP em outros aparelhos e iOS são bem-vindas na issue #93.',
      cardTitle: 'Experimente o slider no grafo em produção (#93)',
      cardBody: 'Puxe a barra de zoom de ponta a ponta no celular ou desktop e compare a fluidez.',
      prodUrl: 'atlas-bellussi.pages.dev/grafos/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues/93',
      footer: 'Post 09 · campanha slider',
    },
  },
  {
    dir: '10-mapa',
    headerLabel: 'MAPA-MÚNDI — #10',
    footerCover: 'atlas-bellussi.pages.dev/mapa/',
    ctaTheme: 'red',
    cover: {
      image: ASSETS.mapa1930,
      pos: 'center 42%',
      stamp: ['129 TERRITÓRIOS', '1930'],
      heroSize: 'display--xl',
      titleBefore: 'O mundo em ',
      titleRed: '1930.',
      subtitle:
        'Um globo com países, impérios e cidades ativos no recorte, ligados por influência, ruptura e atuação.',
    },
    evidence: {
      kind: 'screenshot',
      titleBefore: 'Arraste o ',
      titleRed: 'tempo.',
      subtitle: 'Doze marcos na régua e quatro recortes prontos, de 1789 a 2026.',
      image: ASSETS.mapaRecorte,
      pos: 'center 60%',
      noteKicker: 'RECORTE 1914–1945',
      noteText:
        '133 territórios e 65 conexões no recorte; itens sem datação estrita ficam declarados fora.',
      footer: 'Mapa-múndi — Natural Earth 1:50m + Wikidata',
    },
    mechanics: {
      titleBefore: 'Clique num ',
      titleOchre: 'país.',
      colA: 'CAMADA',
      colB: 'O QUE ABRE',
      rows: [
        { left: 'Países atuais', right: '76 em 1930' },
        { left: 'Entidades históricas', right: '12 em 1930' },
        { left: 'Cidades e lugares', right: '41 no globo' },
        { left: 'Conexões', right: '7 famílias de relação' },
      ],
      steps: [
        {
          title: '1. Escolha o recorte',
          desc: 'Ano exato ou intervalo; a legenda mostra o que ficou de fora.',
        },
        { title: '2. Leia a ficha', desc: 'Regimes, conexões e verbetes ancorados no território.' },
        {
          title: '3. Confira a base',
          desc: 'Contornos contemporâneos de referência e dados do Wikidata.',
        },
      ],
      takeawayKicker: 'TRANSPARÊNCIA DE RECORTE',
      takeaway:
        'Divisas seguem contornos atuais; entidades históricas respondem a coordenadas e vigência documental.',
      footer: 'Globo interativo — acessível por lista',
    },
    cta: {
      titleBefore: 'Que período ou ',
      titleOchre: 'país falta?',
      subtitle:
        'O mapa cresce por sugestão de quem estuda e ensina história, com o Brasil como ponto de partida.',
      scope:
        'A cobertura é crescente e declarada na tela; sugestões viram issue e entram depois de fonte conferida.',
      cardTitle: 'Explore o mapa e sugira um recorte',
      cardBody:
        'Arraste a linha do tempo, selecione um país e verifique os limites do recorte na própria página.',
      prodUrl: 'atlas-bellussi.pages.dev/mapa/',
      githubUrl: 'github.com/bellussi1/ATLAS/issues',
      footer: 'Post 10 — campanha mapa',
    },
  },
  {
    dir: '11-lacunas',
    headerLabel: 'GRAFO — #11',
    footerCover: 'atlas-bellussi.pages.dev/grafos/',
    ctaTheme: 'indigo',
    cover: {
      image: ASSETS.grafoLacunas,
      pos: 'center 46%',
      stamp: ['1.318 REGISTROS', '2.512 LIGAÇÕES'],
      heroSize: 'display--xl',
      titleBefore: 'Hitler e o ',
      titleRed: 'nazismo.',
      subtitle:
        'Parece óbvio que estejam ligados num mapa de história. O grafo ainda não liga, porque falta a frase com fonte.',
    },
    evidence: {
      kind: 'screenshot',
      titleBefore: 'Toda ligação tem ',
      titleRed: 'fonte.',
      image: ASSETS.grafoDetalhe,
      pos: 'center 12%',
      noteKicker: 'GRAFO — PAINEL DE CONEXÕES',
      noteText:
        'Cada aresta visível aponta para uma afirmação com citação e fonte; o resto sai da rede.',
      footer: '1.318 registros — 2.512 ligações visíveis',
    },
    mechanics: {
      titleBefore: 'Sete tipos de ',
      titleOchre: 'ligação.',
      colA: 'FAMÍLIA',
      colB: 'LIGAÇÕES',
      rows: [
        { left: 'Influência', right: '850' },
        { left: 'Atuação', right: '679' },
        { left: 'Filiação', right: '287' },
        { left: 'Criação', right: '242' },
        { left: 'Ruptura', right: '186' },
        { left: 'Lugar', right: '147' },
      ],
      steps: [
        {
          title: '1. Escolha um par',
          desc: 'A lista prioriza Brasil, Europa, EUA, Ásia e África.',
        },
        {
          title: '2. Ache a fonte',
          desc: 'A afirmação precisa citar os dois registros, não só o tema.',
        },
        { title: '3. Abra o PR', desc: 'Cerca de uma hora por par; a validação é determinística.' },
      ],
      takeawayKicker: 'PISO EDITORIAL',
      takeaway: '512 relações genéricas saíram da rede em vez de fingir conexão sem evidência.',
      footer: '19 pares e 28 verbetes em aberto',
    },
    cta: {
      titleBefore: '19 pares, ',
      titleOchre: '28 verbetes.',
      subtitle: 'A lista de lacunas é pública e cada item cabe numa tarde de leitura com fonte.',
      scope:
        'Números conferidos no release em produção; a revisão editorial continua humana e aberta no repositório.',
      cardTitle: 'Escolha um par e abra o primeiro PR',
      cardBody:
        'Leia a lista em GRAFO-TIPOS.md, encontre a citação e rode test:content antes de enviar.',
      prodUrl: 'atlas-bellussi.pages.dev/grafos/',
      githubUrl: 'github.com/bellussi1/ATLAS/blob/master/docs/design/GRAFO-TIPOS.md',
      footer: 'Post 11 — campanha lacunas',
    },
  },
];

function wrapHtml(innerHtml) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>${BASE_CSS}</style>
</head>
<body>
${innerHtml}
</body>
</html>`;
}

async function launchBrowser() {
  for (const opts of [
    { channel: 'chrome', headless: true },
    { channel: 'msedge', headless: true },
    { headless: true },
  ]) {
    try {
      return await chromium.launch(opts);
    } catch {}
  }
  throw new Error('Nenhum navegador Chrome, Edge ou Chromium disponível para Playwright.');
}

async function main() {
  const { values } = parseArgs({
    options: { post: { type: 'string', multiple: true, default: [] } },
  });
  const selected =
    values.post.length > 0 ? POSTS.filter((post) => values.post.includes(post.dir)) : POSTS;
  if (selected.length === 0) {
    throw new Error(`nenhum post corresponde a: ${values.post.join(', ')}`);
  }

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const names = ['01-capa.jpg', '02-evidencia.jpg', '03-mecanica.jpg', '04-cta.jpg'];

    for (const post of selected) {
      const postDir = resolve(here, 'posts', post.dir);
      const imgDir = resolve(postDir, 'imagens');
      await mkdir(imgDir, { recursive: true });

      const slides = [
        renderSlide1(post),
        renderSlide2(post),
        renderSlide3(post),
        renderSlide4(post),
      ];

      for (let i = 0; i < slides.length; i += 1) {
        await page.setContent(wrapHtml(slides[i]), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const buffer = await page.screenshot({
          type: 'jpeg',
          quality: 94,
          clip: { x: 0, y: 0, width: 1080, height: 1350 },
        });
        await writeFile(resolve(imgDir, names[i]), buffer);
      }

      await page.setContent(wrapHtml(slides.join('\n')), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const pdfBuffer = await page.pdf({
        width: '1080px',
        height: '1350px',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });
      await writeFile(resolve(postDir, 'carrossel.pdf'), pdfBuffer);
      console.log(`Renderizado: ${post.dir} (4 JPEGs + carrossel.pdf)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
