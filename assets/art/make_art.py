"""Draws the character faces in this folder (own fan-style drawings, no official art).
Run: python3 assets/art/make_art.py  (needs Pillow). Output: 256x256 PNGs."""
from PIL import Image, ImageDraw
import os

S = 4            # supersample
N = 256 * S
OUT = os.path.dirname(os.path.abspath(__file__))
INK = '#1B2A5E'

def new():
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def e(d, cx, cy, rx, ry, fill, ink=INK, w=6):
    d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill, outline=ink, width=w * S)

def poly(d, pts, fill, ink=INK, w=6):
    p = [(x * S, y * S) for x, y in pts]
    d.polygon(p, fill=fill)
    d.line(p + [p[0]], fill=ink, width=w * S, joint='curve')

def eyes(d, lx, rx, y, r=11, ink=INK):
    for x in (lx, rx):
        e(d, x, y, r, r * 1.15, '#14142B', ink, 0)
        e(d, x + r * .3, y - r * .4, r * .38, r * .38, 'white', ink, 0)

def smile(d, cx, cy, w, h, ink=INK, lw=5):
    d.arc([(cx - w) * S, (cy - h) * S, (cx + w) * S, (cy + h) * S], 15, 165, fill=ink, width=lw * S)

def blush(d, lx, rx, y):
    for x in (lx, rx):
        e(d, x, y, 12, 8, '#FFB3C1', '#FFB3C1', 0)

def save(im, name):
    im.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, name + '.png'))

def stitch():
    im, d = new()
    poly(d, [(20, 40), (95, 82), (80, 120), (45, 105)], '#4A7BD8')
    poly(d, [(236, 40), (161, 82), (176, 120), (211, 105)], '#4A7BD8')
    poly(d, [(36, 54), (80, 88), (68, 104)], '#FF8FB1', w=0)
    poly(d, [(220, 54), (176, 88), (188, 104)], '#FF8FB1', w=0)
    e(d, 128, 150, 88, 78, '#4A7BD8')
    e(d, 128, 178, 52, 38, '#9BBBF0', '#9BBBF0', 0)
    e(d, 92, 135, 24, 24, '#9BBBF0', '#9BBBF0', 0)
    e(d, 164, 135, 24, 24, '#9BBBF0', '#9BBBF0', 0)
    eyes(d, 92, 164, 135, 15)
    e(d, 128, 164, 17, 11, INK, INK, 0)
    smile(d, 128, 178, 26, 18)
    blush(d, 66, 190, 168)
    save(im, 'stitch')

def mickey():
    im, d = new()
    e(d, 60, 52, 38, 38, '#222233', '#111122')
    e(d, 196, 52, 38, 38, '#222233', '#111122')
    e(d, 128, 150, 76, 72, '#222233', '#111122')
    e(d, 128, 164, 60, 52, '#FFD9B5', '#111122', 5)
    e(d, 106, 128, 20, 28, '#FFFFFF', '#111122', 4)
    e(d, 150, 128, 20, 28, '#FFFFFF', '#111122', 4)
    for x in (110, 146):
        e(d, x, 134, 7, 11, '#14142B', '#14142B', 0)
    e(d, 128, 160, 14, 10, '#222233', '#111122', 0)
    smile(d, 128, 172, 30, 22, '#111122')
    blush(d, 82, 174, 178)
    save(im, 'mickey')

def minnie():
    im, d = new()
    e(d, 60, 52, 38, 38, '#222233', '#111122')
    e(d, 196, 52, 38, 38, '#222233', '#111122')
    e(d, 128, 156, 76, 70, '#222233', '#111122')
    e(d, 128, 168, 60, 50, '#FFD9B5', '#111122', 5)
    e(d, 106, 134, 18, 26, '#FFFFFF', '#111122', 4)
    e(d, 150, 134, 18, 26, '#FFFFFF', '#111122', 4)
    for x in (109, 147):
        e(d, x, 140, 7, 11, '#14142B', '#14142B', 0)
    e(d, 128, 164, 14, 10, '#222233', '#111122', 0)
    smile(d, 128, 176, 28, 20, '#111122')
    blush(d, 82, 174, 180)
    # red bow with white dots
    poly(d, [(128, 66), (84, 38), (84, 94)], '#E53935', '#8E1B1B', 5)
    poly(d, [(128, 66), (172, 38), (172, 94)], '#E53935', '#8E1B1B', 5)
    e(d, 128, 66, 13, 13, '#E53935', '#8E1B1B', 5)
    for x, y in ((104, 62), (152, 62)):
        e(d, x, y, 5, 5, 'white', 'white', 0)
    save(im, 'minnie')

def olaf():
    im, d = new()
    e(d, 128, 150, 82, 78, '#FFFFFF', '#5B7FA6')
    # hair twigs
    for x in (112, 128, 144):
        d.line([(x * S, 76 * S), ((x + (x - 128) * .6) * S, 46 * S)], fill='#5D4037', width=5 * S)
    e(d, 96, 126, 13, 15, '#14142B', '#14142B', 0)
    e(d, 160, 126, 13, 15, '#14142B', '#14142B', 0)
    e(d, 99, 121, 5, 5, 'white', 'white', 0)
    e(d, 163, 121, 5, 5, 'white', 'white', 0)
    for x, dx in ((96, -1), (160, 1)):
        d.line([((x - 14) * S, 104 * S), ((x + 14) * S, 100 * S)], fill='#5B7FA6', width=4 * S)
    poly(d, [(128, 134), (128, 160), (172, 158)], '#FB8C00', '#B55A00', 5)   # carrot nose
    d.chord([86 * S, 150 * S, 170 * S, 214 * S], 0, 180, fill='#FFFFFF', outline='#5B7FA6', width=5 * S)
    d.chord([96 * S, 160 * S, 160 * S, 208 * S], 0, 180, fill='#F48FB1', outline='#F48FB1', width=0)
    blush(d, 70, 186, 160)
    save(im, 'olaf')

def pooh():
    im, d = new()
    e(d, 66, 62, 24, 24, '#E8A33D', '#7A4B12'); e(d, 190, 62, 24, 24, '#E8A33D', '#7A4B12')
    e(d, 66, 64, 11, 11, '#F5C26B', '#F5C26B', 0); e(d, 190, 64, 11, 11, '#F5C26B', '#F5C26B', 0)
    e(d, 128, 142, 90, 80, '#E8A33D', '#7A4B12')
    e(d, 128, 172, 46, 34, '#F5C26B', '#F5C26B', 0)
    e(d, 96, 126, 8, 9, '#14142B', '#14142B', 0); e(d, 160, 126, 8, 9, '#14142B', '#14142B', 0)
    e(d, 99, 123, 3, 3, 'white', 'white', 0); e(d, 163, 123, 3, 3, 'white', 'white', 0)
    e(d, 128, 156, 15, 11, '#3E2723', '#3E2723', 0)
    smile(d, 128, 168, 20, 16, '#5D3A12', 4)
    blush(d, 72, 184, 164)
    # red shirt collar
    d.chord([54 * S, 190 * S, 202 * S, 244 * S], 180, 360, fill='#E53935', outline='#8E1B1B', width=5 * S)
    save(im, 'pooh')

def simba():
    im, d = new()
    e(d, 128, 142, 100, 96, '#C9772B', '#6B3A0F')     # mane
    e(d, 62, 70, 22, 22, '#E8B26A', '#6B3A0F'); e(d, 194, 70, 22, 22, '#E8B26A', '#6B3A0F')
    e(d, 128, 150, 64, 60, '#E8B26A', '#6B3A0F')
    e(d, 128, 176, 38, 28, '#FFF1D6', '#FFF1D6', 0)
    e(d, 104, 134, 9, 11, '#14142B', '#14142B', 0); e(d, 152, 134, 9, 11, '#14142B', '#14142B', 0)
    e(d, 107, 130, 3.5, 3.5, 'white', 'white', 0); e(d, 155, 130, 3.5, 3.5, 'white', 'white', 0)
    poly(d, [(116, 158), (140, 158), (128, 172)], '#6D3B2B', '#3E1F14', 3)
    smile(d, 114, 176, 14, 11, '#3E1F14', 4); smile(d, 142, 176, 14, 11, '#3E1F14', 4)
    blush(d, 84, 172, 168)
    save(im, 'simba')

def nemo():
    im, d = new()
    poly(d, [(14, 96), (74, 128), (14, 178)], '#FB8C00', '#7A3B00')           # tail fin
    poly(d, [(110, 50), (150, 20), (178, 62)], '#FB8C00', '#7A3B00')          # top fin
    e(d, 140, 126, 98, 70, '#FB8C00', '#7A3B00')
    for cx, w in ((100, 14), (156, 12)):                                          # white stripes
        d.rectangle([(cx - w) * S, 70 * S, (cx + w) * S, 184 * S], fill=None)
    d.chord([86 * S, 58 * S, 122 * S, 196 * S], 90, 270, fill=None)
    for x0, x1 in ((92, 112), (148, 166)):
        d.polygon([(x0 * S, 64 * S), (x1 * S, 64 * S), ((x1 + 2) * S, 190 * S), ((x0 - 2) * S, 190 * S)], fill='#FFFFFF')
    d.ellipse([(140 - 98) * S, (126 - 70) * S, (140 + 98) * S, (126 + 70) * S], outline='#7A3B00', width=6 * S)
    e(d, 190, 114, 20, 20, '#FFFFFF', '#14142B', 4)
    e(d, 194, 116, 10, 10, '#14142B', '#14142B', 0)
    e(d, 197, 112, 3.5, 3.5, 'white', 'white', 0)
    smile(d, 196, 150, 18, 12, '#7A3B00', 4)
    save(im, 'nemo')

for f in (stitch, mickey, minnie, olaf, pooh, simba, nemo):
    f()
