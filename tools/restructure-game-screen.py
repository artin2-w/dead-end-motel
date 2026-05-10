"""One-off HTML restructure for Night Desk Command Center. Run from repo root."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "index.html"
text = path.read_text(encoding="utf-8")

# Extract shift-status-card block
shift_re = re.compile(
    r"(        <section class=\"shift-status-card v41-shift-ribbon\">.*?</section>\n)",
    re.DOTALL,
)
shift_m = shift_re.search(text)
if not shift_m:
    raise SystemExit("shift-status-card not found")
shift_block = shift_m.group(1)
text = shift_re.sub("", text, count=1)

# Extract motel-command-board (single line div)
mcb_re = re.compile(
    r"        <div id=\"motel-command-board\" class=\"motel-command-board v43-command-strip-wrap\" aria-label=\"Motel command overview\"></div>\n"
)
mcb_m = mcb_re.search(text)
if not mcb_m:
    raise SystemExit("motel-command-board not found")
mcb_line = mcb_m.group(0)
text = mcb_re.sub("", text, count=1)

# Remove guest-queue line from frontdesk (keep parent structure)
text = re.sub(
    r"                <div id=\"guest-queue\" class=\"card-list v43-guest-queue\"></div>\n",
    "",
    text,
    count=1,
)

# Replace game-play opening with rebuilt shell + slip + decision start
old_open = """      <!-- Game screen: desk + intel + dock -->
      <section id=\"game-screen\" class=\"screen\">
        <div class=\"game-play-layout\">
          <div class=\"game-play-main\">
        <nav class=\"panel-tabs v41-panel-tabs\" aria-label=\"Shift panels\">"""

new_open = """      <!-- Night Desk Command Center (visual rebuild v2) -->
      <section id=\"game-screen\" class=\"screen\">
        <div class=\"game-rebuilt-shell\">
          <div class=\"night-desk-stage\">
            <aside class=\"guest-slip-zone nd-paper-rail\" aria-label=\"Window intake slip\">
              <div class=\"nd-slip-clip\">
                <span class=\"nd-slip-stamp\" aria-hidden=\"true\">IN</span>
                <div class=\"nd-slip-titles\">
                  <h2 class=\"nd-slip-heading\">Intake slip</h2>
                  <p class=\"nd-slip-lede muted\">Who is standing at the glass.</p>
                </div>
              </div>
              <div id=\"guest-queue\" class=\"card-list v43-guest-queue nd-guest-queue\"></div>
            </aside>
            <div class=\"decision-board-zone nd-crt-bezel\">
        <nav class=\"panel-tabs v41-panel-tabs nd-panel-tabs\" aria-label=\"Shift panels\">"""

if old_open not in text:
    raise SystemExit("old_open block not found")
text = text.replace(old_open, new_open, 1)

# After </nav>, insert board chrome (shift was removed already by regex)
nav_end = """        </nav>

        <div id=\"v50-priority-card\""""
if nav_end not in text:
    raise SystemExit("nav_end anchor not found")
text = text.replace(
    nav_end,
    """        </nav>

              <div class=\"nd-board-chrome\">
                <h2 class=\"nd-board-main-title\" id=\"nd-board-main-title\">Night command board</h2>
                <p class=\"nd-board-context muted\" id=\"nd-board-context\">Front desk channel</p>
              </div>

        <div id=\"v50-priority-card\"""",
    1,
)

# Replace closing: layout-grid </div> + wrong closings + intel aside + play-layout close
# Pattern: report section </section> </div> </div> <aside game-intel
old_close = """          </section>
        </div>
          </div>
          <aside class=\"game-intel-rail\" aria-label=\"Intelligence and optional site references\">
            <div class=\"game-intel-block\">"""

new_close = """          </section>
        </div>
            </div>
            <aside class=\"pressure-intel-zone nd-paper-rail\" aria-label=\"Pressure, alerts, and references\">
""" + shift_block + mcb_line + """              <div class=\"game-intel-block nd-intel-block\">"""

if old_close not in text:
    raise SystemExit("old_close block not found")
text = text.replace(old_close, new_close, 1)

# Close intel aside + stage + shell (was: </aside> </div> footer)
old_intel_end = """              <p class=\"game-rule-chips muted\" aria-label=\"Common rule references\">Rules: <span class=\"game-rule-chip\">204</span><span class=\"game-rule-chip\">118</span><span class=\"game-rule-chip\">404</span><span class=\"game-rule-chip\">911</span></p>
            </div>
          </aside>
        </div>
        <footer class=\"game-tool-dock\""""

new_intel_end = """              <p class=\"game-rule-chips muted\" aria-label=\"Common rule references\">Rules: <span class=\"game-rule-chip\">204</span><span class=\"game-rule-chip\">118</span><span class=\"game-rule-chip\">404</span><span class=\"game-rule-chip\">911</span></p>
            </div>
            </aside>
          </div>
        </div>
        <footer class=\"desk-equipment-dock game-tool-dock\""""

if old_intel_end not in text:
    raise SystemExit("old_intel_end not found")
text = text.replace(old_intel_end, new_intel_end, 1)

path.write_text(text, encoding="utf-8")
print("OK: index.html game screen restructured")
