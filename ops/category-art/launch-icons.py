"""Draws the four hand-made launch icons (momo, roll, drink, chaat) in the reference style; the SVGs are committed in
backend/src/main/resources/static/category-art/ and (as the style shown to the model) category-art-examples/. Edit a
drawing here and run: python3 ops/category-art/launch-icons.py <output folder>, then copy the files over. Ink #30404E."""
import math, sys, random
INK = "#30404E"
SW = 9          # main line
DOT = 6         # stipple dots drawn as zero-length round-capped strokes

def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n'
            f'<g fill="none" stroke="{INK}" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">\n'
            + body + '</g>\n</svg>\n')

def r(v): return f"{v:.1f}".rstrip('0').rstrip('.')
def circle(cx, cy, rad, sw=None): return f'<circle cx="{r(cx)}" cy="{r(cy)}" r="{r(rad)}"' + (f' stroke-width="{sw}"' if sw else '') + '/>\n'
def path(d, sw=None): return f'<path d="{d}"' + (f' stroke-width="{sw}"' if sw else '') + '/>\n'
def dot(x, y): return f'<path d="M{r(x)} {r(y)}h.1" stroke-width="{DOT}"/>\n'
def dots(pts): return ''.join(dot(x, y) for x, y in pts)
def group(t, inner): return f'<g transform="{t}">\n{inner}</g>\n'
def plate(): return circle(256, 256, 232)

def scatter(cx, cy, rad, n, seed, minsep=22):
    rnd = random.Random(seed); pts = []; tries = 0
    while len(pts) < n and tries < 4000:
        tries += 1
        a = rnd.uniform(0, 2*math.pi); d = rad*math.sqrt(rnd.random())
        x, y = cx + d*math.cos(a), cy + d*math.sin(a)
        if all((x-px)**2 + (y-py)**2 >= minsep**2 for px, py in pts): pts.append((x, y))
    return pts

# ---------- Momos: six pleated dumplings round a small chutney bowl ----------
def dumpling():
    body = path("M-54 22C-60-62 60-62 54 22Q0 42-54 22Z")
    pleats = path("M-30-30L-24 4M-10-40L-8 8M10-40L8 8M30-30L24 4", sw=7)
    return body + pleats
def momos():
    out = plate()
    for i in range(6):
        th = math.radians(-90 + i*60)
        x, y = 256 + 136*math.cos(th), 256 + 136*math.sin(th)
        out += group(f"translate({r(x)} {r(y)}) rotate({r(math.degrees(th)+90)})", dumpling())
    out += circle(256, 256, 46) + circle(256, 256, 31, sw=6) + dots([(244, 252), (262, 246), (258, 267), (242, 268)])
    return svg(out)

# ---------- Rolls: two wrapped rolls, a dip bowl and onion rings ----------
def roll():
    body = path("M-120-38H70A38 38 0 0 1 70 38H-120A24 38 0 0 1-120-38Z")
    face = circle(70, 0, 0)  # placeholder removed below
    cut = path("M70-38A22 38 0 0 0 70 38")                    # open end seen at an angle
    swirl = path("M70-22C84-26 92-12 84-2C78 6 66 2 70-8", sw=6)
    wrap = path("M-50-38L-34 38M-6-38L10 38", sw=7)
    return body + cut + swirl + wrap
def rolls():
    out = plate()
    out += group("translate(236 190) rotate(-18)", roll())
    out += group("translate(250 300) rotate(-18)", roll())
    out += circle(388, 384, 40) + circle(388, 384, 26, sw=6) + dots([(380, 380), (396, 388)])
    out += circle(140, 390, 26, sw=7) + circle(140, 390, 12, sw=6)
    return svg(out)

# ---------- Drinks: tall glass with ice, straw and a lemon wheel ----------
def drinks():
    out = plate()
    out += path("M178 150H334L312 392Q310 408 294 408H218Q202 408 200 392Z")      # glass
    out += path("M186 214C214 230 242 198 270 214C298 230 316 214 326 210", sw=7)  # liquid line
    out += path("M214 250L242 244L248 274L220 280Z", sw=7)                           # ice
    out += path("M268 292L296 286L302 316L274 322Z", sw=7)
    out += path("M268 128L322 70L340 86L292 150", sw=8)                              # straw
    out += circle(176, 154, 40, sw=7) + circle(176, 154, 26, sw=5)                   # lemon wheel
    out += path("M176 130V178M152 142L200 166M152 166L200 142", sw=5)
    out += dots([(226, 366), (252, 346), (280, 372)])
    return svg(out)

# ---------- Chaat: heaped bowl of papdi, sev and chutney with a leaf ----------
def papdi(x, y, a):
    return group(f"translate({r(x)} {r(y)}) rotate({a})", circle(0, 0, 34) + dots([(-11, -9), (9, -11), (0, 4), (13, 11), (-13, 13)]))
def chaat():
    out = plate()
    out += circle(256, 262, 104)
    out += path("M168 270C162 218 202 180 256 180C310 180 350 218 344 270") + path("M168 270Q256 318 344 270")
    out += path("M192 236C210 216 228 252 246 220C262 194 282 240 298 216C312 198 326 228 330 238", sw=7)
    out += path("M182 256C204 244 218 272 242 252C264 236 280 270 304 248", sw=7)
    out += dots([(214, 294), (246, 302), (282, 298), (312, 288), (232, 196), (284, 194)])
    for ang, rad in ((205, 168), (320, 170), (100, 170)):
        out += papdi(256 + rad*math.cos(math.radians(ang)), 256 + rad*math.sin(math.radians(ang)), ang)
    out += path("M372 340C396 322 424 330 424 360C404 376 380 368 372 340Z", sw=8) + path("M378 342C396 344 410 352 418 360", sw=6)
    return svg(out)

if __name__ == '__main__':
    outdir = sys.argv[1]
    for name, fn in (('momos', momos), ('rolls', rolls), ('drinks', drinks), ('chaat', chaat)):
        open(f'{outdir}/{name}.svg', 'w').write(fn())
        print(name, len(fn()), 'bytes')
