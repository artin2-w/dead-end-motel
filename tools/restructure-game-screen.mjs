import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const p = path.join(ROOT, 'index.html');
let t = fs.readFileSync(p, 'utf8');

const shiftRe =
  /        <section class="shift-status-card v41-shift-ribbon">[\s\S]*?        <\/section>\n\n/;
const shiftM = t.match(shiftRe);
if (!shiftM) {
  console.error('shift-status-card not found');
  process.exit(1);
}
const shiftBlock = shiftM[0];
t = t.replace(shiftRe, '');

const mcbRe =
  /        <div id="motel-command-board" class="motel-command-board v43-command-strip-wrap" aria-label="Motel command overview"><\/div>\n\n/;
if (!mcbRe.test(t)) {
  console.error('motel-command-board not found');
  process.exit(1);
}
const mcbLine = t.match(mcbRe)[0];
t = t.replace(mcbRe, '');

t = t.replace(
  /                <div id="guest-queue" class="card-list v43-guest-queue"><\/div>\n/,
  ''
);

const oldOpen = `      <!-- Game screen: desk + intel + dock -->
      <section id="game-screen" class="screen">
        <div class="game-play-layout">
          <div class="game-play-main">
        <nav class="panel-tabs v41-panel-tabs" aria-label="Shift panels">`;

const newOpen = `      <!-- Night Desk Command Center (visual rebuild v2) -->
      <section id="game-screen" class="screen">
        <div class="game-rebuilt-shell">
          <div class="night-desk-stage">
            <aside class="guest-slip-zone nd-paper-rail" aria-label="Window intake slip">
              <div class="nd-slip-clip">
                <span class="nd-slip-stamp" aria-hidden="true">IN</span>
                <div class="nd-slip-titles">
                  <h2 class="nd-slip-heading">Intake slip</h2>
                  <p class="nd-slip-lede muted">Who is standing at the glass.</p>
                </div>
              </div>
              <div id="guest-queue" class="card-list v43-guest-queue nd-guest-queue"></div>
            </aside>
            <div class="decision-board-zone nd-crt-bezel">
        <nav class="panel-tabs v41-panel-tabs nd-panel-tabs" aria-label="Shift panels">`;

if (!t.includes(oldOpen)) {
  console.error('old_open block not found');
  process.exit(1);
}
t = t.replace(oldOpen, newOpen);

const navEnd = `        </nav>

        <div id="v50-priority-card"`;
if (!t.includes(navEnd)) {
  console.error('nav_end anchor not found');
  process.exit(1);
}
t = t.replace(
  navEnd,
  `        </nav>

              <div class="nd-board-chrome">
                <h2 class="nd-board-main-title" id="nd-board-main-title">Night command board</h2>
                <p class="nd-board-context muted" id="nd-board-context">Front desk channel</p>
              </div>

        <div id="v50-priority-card"`
);

const oldClose = `          </section>
        </div>
          </div>
          <aside class="game-intel-rail" aria-label="Intelligence and optional site references">
            <div class="game-intel-block">`;

const newClose = `          </section>
        </div>
            </div>
            <aside class="pressure-intel-zone nd-paper-rail" aria-label="Pressure, alerts, and references">
${shiftBlock}${mcbLine}              <div class="game-intel-block nd-intel-block">`;

if (!t.includes(oldClose)) {
  console.error('old_close block not found');
  process.exit(1);
}
t = t.replace(oldClose, newClose);

const oldIntelEnd = `              <p class="game-rule-chips muted" aria-label="Common rule references">Rules: <span class="game-rule-chip">204</span><span class="game-rule-chip">118</span><span class="game-rule-chip">404</span><span class="game-rule-chip">911</span></p>
            </div>
          </aside>
        </div>
        <footer class="game-tool-dock"`;

const newIntelEnd = `              <p class="game-rule-chips muted" aria-label="Common rule references">Rules: <span class="game-rule-chip">204</span><span class="game-rule-chip">118</span><span class="game-rule-chip">404</span><span class="game-rule-chip">911</span></p>
            </div>
            </aside>
          </div>
        </div>
        <footer class="desk-equipment-dock game-tool-dock"`;

if (!t.includes(oldIntelEnd)) {
  console.error('old_intel_end not found');
  process.exit(1);
}
t = t.replace(oldIntelEnd, newIntelEnd);

fs.writeFileSync(p, t);
console.log('OK: index.html game screen restructured');
