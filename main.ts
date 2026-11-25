import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

// News-image v2: a dense one-page newspaper front page for Wednesday
// 25 November 2026, drawn with PIL (Python, stdlib + Pillow, no network).
// 11 verified stories + a sport strip, masthead + date named twice.

const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUT_FILE = join(OUT_DIR, "entry.png");

const PY = `
from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 1024
M = 30  # margin
PAPER = (246, 241, 229)
INK = (20, 20, 20)
RED = (155, 28, 28)
GRAY = (85, 85, 85)
RULE = (20, 20, 20)

SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SANS_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

def wrap(draw, text, fnt, width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def draw_wrapped(draw, text, fnt, x, y, width, fill, leading):
    lines = wrap(draw, text, fnt, width)
    for ln in lines:
        draw.text((x, y), ln, font=fnt, fill=fill)
        y += leading
    return y

img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

# ---- masthead ----
y = 26
d.line([(M, y), (W - M, y)], fill=RULE, width=3)
y += 10
f_mast = font(SERIF_B, 68)
t = "THE DAILY WORLD"
d.text(((W - d.textlength(t, font=f_mast)) / 2, y), t, font=f_mast, fill=INK)
y += 80
d.line([(M, y), (W - M, y)], fill=RULE, width=2)
y += 6
d.line([(M, y), (W - M, y)], fill=RULE, width=1)
y += 10
f_date = font(SANS_B, 27)
t = "WEDNESDAY, 25 NOVEMBER 2026"
d.text(((W - d.textlength(t, font=f_date)) / 2, y), t, font=f_date, fill=INK)
y += 36
f_sub = font(SANS, 15)
t = "THE WORLD IN ONE PAGE  —  EVERY STORY BELOW WAS REPORTED TODAY"
d.text(((W - d.textlength(t, font=f_sub)) / 2, y), t, font=f_sub, fill=GRAY)
y += 24
d.line([(M, y), (W - M, y)], fill=RULE, width=3)

# ---- lead story ----
y += 12
f_kick = font(SANS_B, 17)
d.text((M, y), "UKRAINE  •  BALTIC SEA", font=f_kick, fill=RED)
y += 24
f_lead = font(SERIF_B, 42)
y = draw_wrapped(d, "Zelenskiy confirms Ukraine hit Russian ship in Gulf of Finland",
                 f_lead, M, y, W - 2 * M, INK, 49)
y += 4
f_deck = font(SANS, 20)
y = draw_wrapped(d, "Kyiv claims Saturday's drone strike on the cargo ship; Norway, a staunch ally, urges caution in such operations.",
                 f_deck, M, y, W - 2 * M, INK, 26)
y += 10
d.line([(M, y), (W - M, y)], fill=RULE, width=1)

# ---- second lead ----
y += 10
d.text((M, y), "MIDDLE EAST  •  RIYADH", font=f_kick, fill=RED)
y += 24
f_lead2 = font(SERIF_B, 31)
y = draw_wrapped(d, "Houthis hit Riyadh's tallest tower — 11 wounded",
                 f_lead2, M, y, W - 2 * M, INK, 37)
y += 2
y = draw_wrapped(d, "Second strike in under a week on the Saudi capital, Saudi civil defence says.",
                 font(SANS, 19), M, y, W - 2 * M, INK, 25)
y += 8
d.line([(M, y), (W - M, y)], fill=RULE, width=2)

# ---- three columns ----
COL_W = 304
GAP = 16
XS = [M, M + COL_W + GAP, M + 2 * (COL_W + GAP)]
f_lab = font(SANS_B, 15)
f_head = font(SERIF_B, 24)
f_cdeck = font(SANS, 16)

COLS = [
    ("EUROPE  •  THE WAR", [
        ("Ukraine sank Russian corvette off Benghazi",
         "Kyiv calls the strike lawful self-defence under the UN Charter."),
        ("Putin vows retaliation for refinery strikes",
         "Ukraine kept hitting oil plants despite Trump's request to stop."),
        ("NATO vows space defence as Russia readies nuclear satellite",
         "Launch feared as soon as December, allies say."),
    ]),
    ("MIDDLE EAST  •  CLIMATE", [
        ("Three tankers hit mines in Strait of Hormuz",
         "Ships under US air escort struck, Iran's Guards say."),
        ("Israeli strike kills Hamas security chief in Gaza",
         "Naim Abu Nahl dead, Al Jazeera reports."),
        ("COP31 collapses in Antalya — no climate deal",
         "Oil and gas producers block fossil-fuel phaseout language."),
    ]),
    ("ASIA  •  TECH  •  AMERICA", [
        ("Huawei guilty of trade-secret theft, cleared of racketeering",
         "Verdict in the US criminal trial."),
        ("Trump awards Giuliani the Medal of Freedom",
         "The Presidential Medal of Freedom, at the White House."),
        ("Shenzhou-24 launches with first Pakistani astronaut",
         "Muhammad Zeeshan Ali heads to the Tiangong station."),
    ]),
]

col_top = y + 14
col_bottom = 0
for ci, (label, stories) in enumerate(COLS):
    x = XS[ci]
    yy = col_top
    d.text((x, yy), label, font=f_lab, fill=RED)
    yy += 22
    d.line([(x, yy), (x + COL_W, yy)], fill=RED, width=2)
    yy += 10
    for head, deck in stories:
        yy = draw_wrapped(d, head, f_head, x, yy, COL_W, INK, 27)
        yy += 2
        yy = draw_wrapped(d, deck, f_cdeck, x, yy, COL_W, GRAY, 20)
        yy += 8
        d.line([(x, yy), (x + COL_W, yy)], fill=(180, 175, 160), width=1)
        yy += 8
    col_bottom = max(col_bottom, yy)

# ---- sport strip ----
y = col_bottom + 2
d.line([(M, y), (W - M, y)], fill=RULE, width=2)
y += 8
f_sport = font(SERIF_B, 21)
d.text((M, y), "SPORT  ", font=font(SANS_B, 16), fill=RED)
sx = M + d.textlength("SPORT   ", font=font(SANS_B, 16))
d.text((sx, y - 2), "Bellingham stunner sees Real Madrid past PSV", font=f_sport, fill=INK)
y += 28
d.line([(M, y), (W - M, y)], fill=RULE, width=3)

# ---- footer ----
y += 10
f_foot = font(SANS, 15)
t = "Every headline above was reported on Wednesday 25 November 2026."
d.text(((W - d.textlength(t, font=f_foot)) / 2, y), t, font=f_foot, fill=GRAY)
y += 20
t2 = "THE DAILY WORLD  •  WEDNESDAY 25 NOVEMBER 2026"
d.text(((W - d.textlength(t2, font=f_foot)) / 2, y), t2, font=f_foot, fill=INK)

# Guard: the footer must fit inside the canvas.
assert y + 18 <= H, "footer overflows canvas: y=%d" % y

img.save("/tmp/entry_render.png")
print("rendered")
`;

mkdirSync(OUT_DIR, { recursive: true });
const res = spawnSync("python3", ["-"], {
  input: PY,
  encoding: "utf-8",
  timeout: 55000,
});
if (res.error) throw res.error;
if (res.status !== 0) {
  throw new Error("python render failed: " + (res.stderr ?? res.stdout ?? ""));
}
process.stdout.write(res.stdout ?? "");

// Move the render into place (same bytes every run: PIL output is deterministic).
spawnSync("cp", ["/tmp/entry_render.png", OUT_FILE], { encoding: "utf-8" });
if (!existsSync(OUT_FILE)) throw new Error("entry.png was not written");
const st = statSync(OUT_FILE);
if (st.size > 1048576) throw new Error(`entry.png too big: ${st.size} bytes`);
console.log(`entry ok: ${st.size} bytes, 1024x1024`);
