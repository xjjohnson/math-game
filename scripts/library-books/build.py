#!/usr/bin/env python3
"""
Builds the Community library's school books from the Texas Bluebonnet Learning
student readers (Texas Education Agency, CC BY-NC-SA 4.0).

  python3 scripts/library-books/build.py <folder with the reader PDFs>

The PDFs come from TEA's file server, named like RLA_G1_U2_Skills_RDR_ENG.pdf;
save them in the folder without the "RLA_" and "_RDR_ENG" parts
(G1_U2_Skills.pdf, G4_U6.pdf). Needs poppler-utils (pdftoppm, pdftohtml)
and Pillow.

Writes the pictures to assets/books/<id>/ and the book list to
src/utils/schoolBooks.generated.ts. Run it again after changing BOOKS.
"""

import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(ROOT, 'assets', 'books')
OUT_TS = os.path.join(ROOT, 'src', 'utils', 'schoolBooks.generated.ts')

READERS = {
    'GK_U6_Skills': ('Kindergarten', 'Kit'),
    'GK_U7_Skills': ('Kindergarten', 'Seth'),
    'GK_U8_Skills': ('Kindergarten', 'Sam'),
    'G1_U2_Skills': ('Grade 1', 'Gran'),
    'G1_U3_Skills': ('Grade 1', 'Fables'),
    'G1_U4_Skills': ('Grade 1', 'A Visit to the Zoo'),
    'G1_U6_Skills': ('Grade 1', 'Grace'),
    'G1_U7_Skills': ('Grade 1', 'Kay and Martez'),
    'G2_U2_Skills': ('Grade 2', 'Bedtime Tales'),
    'G2_U3_Skills': ('Grade 2', 'Kids Excel'),
    'G3_U1': ('Grade 3', 'Classic Tales'),
    'G4_U6': ('Grade 4', 'Treasure Island'),
    'G5_U8': ('Grade 5', 'The Badlands Sleuth: The Case of the Missing Fossils'),
}

# (id, reader, title, cover emoji, first printed page, last printed page, style)
# "picture": each turn shows two printed pages side by side, words and all.
# "chapter": each turn shows one printed page as words, with its pictures.
BOOKS = [
    ('kit', 'GK_U6_Skills', 'Kit', '🏃', 1, 10, 'picture'),
    ('kits-cats', 'GK_U6_Skills', "Kit's Cats", '🐱', 33, 42, 'picture'),
    ('sals-fish-shop', 'GK_U7_Skills', "Sal's Fish Shop", '🐟', 26, 31, 'picture'),
    ('sam-and-the-duck', 'GK_U8_Skills', 'Sam and the Duck', '🦆', 72, 81, 'picture'),
    ('max-in-the-mud', 'GK_U8_Skills', 'Max in the Mud', '🐷', 82, 89, 'picture'),
    ('where-is-king', 'G1_U2_Skills', 'Where Is King?', '🐕', 14, 25, 'picture'),
    ('splash-dogs', 'G1_U2_Skills', 'Splash Dogs', '💦', 82, 87, 'picture'),
    ('fox-and-grapes', 'G1_U3_Skills', 'The Fox and the Grapes', '🍇', 54, 57, 'picture'),
    ('fox-and-crane', 'G1_U3_Skills', 'The Fox and the Crane', '🦊', 66, 69, 'picture'),
    ('big-cats', 'G1_U4_Skills', 'Big Cats', '🐯', 30, 35, 'picture'),
    ('frog-jumping', 'G1_U6_Skills', 'The Frog Jumping Contest', '🐸', 58, 63, 'picture'),
    ('rainforest-ride', 'G1_U7_Skills', 'A Rainforest Ride', '🌴', 72, 75, 'picture'),
    ('hare-and-hedgehog', 'G2_U2_Skills', 'The Hare and the Hedgehog', '🦔', 34, 53, 'picture'),
    ('the-pancake', 'G2_U2_Skills', 'The Pancake', '🥞', 54, 75, 'picture'),
    ('math-contest', 'G2_U3_Skills', 'The Math Contest', '🧮', 80, 91, 'picture'),
    ('alice', 'G3_U1', "Alice's Adventures in Wonderland", '🐇', 33, 72, 'chapter'),
    ('treasure-island', 'G4_U6', 'Treasure Island', '🏴‍☠️', 2, 89, 'chapter'),
    ('badlands-sleuth', 'G5_U8', 'The Badlands Sleuth', '🦴', 1, 57, 'chapter'),
]

LEVEL = {'Kindergarten': 'easy', 'Grade 1': 'easy'}

# Printed pages are rendered this many pixels wide.
PAGE_PX = 640
QUALITY = 70


def run(*args):
    return subprocess.run(args, check=True, capture_output=True).stdout


def page_xml(pdf, first, last):
    """pdftohtml's XML for a page range, with picture boxes (pictures written to a temp folder)."""
    with tempfile.TemporaryDirectory() as tmp:
        out = run('pdftohtml', '-xml', '-stdout', '-f', str(first), '-l', str(last), pdf, os.path.join(tmp, 'x'))
    return ET.fromstring(out)


def is_number(t):
    return re.fullmatch(r'\d+', t.strip() or 'x') is not None


def offset_of(pdf):
    """PDF page number minus printed page number, from the numbers at the page bottoms."""
    seen = {}
    root = page_xml(pdf, 1, 30)
    for page in root.iter('page'):
        h = float(page.get('height'))
        for t in page.iter('text'):
            text = ''.join(t.itertext()).strip()
            if is_number(text) and float(t.get('top')) > h * 0.85:
                d = int(page.get('number')) - int(text)
                seen[d] = seen.get(d, 0) + 1
    return max(seen, key=seen.get)


def clean(s):
    s = s.replace('\u00ad', '').replace('\u00a0', ' ')
    s = re.sub(r'\s+([.,!?;:”’])', r'\1', s)
    s = re.sub(r'([“‘])\s+', r'\1', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


XH = '{http://www.w3.org/1999/xhtml}'


def text_pages(pdf, first, last):
    """pdftotext's word boxes for a page range, keyed by PDF page number."""
    out = run('pdftotext', '-bbox-layout', '-f', str(first), '-l', str(last), pdf, '-')
    root = ET.fromstring(out)
    return {first + i: page for i, page in enumerate(root.iter(XH + 'page'))}


def page_texts(page):
    """The words on one printed page, skipping its page number, as paragraphs and their font sizes."""
    h = float(page.get('height'))
    lines = []
    for line in page.iter(XH + 'line'):
        text = ' '.join(w.text or '' for w in line.iter(XH + 'word'))
        if not text.strip():
            continue
        top, left = float(line.get('yMin')), float(line.get('xMin'))
        height = float(line.get('yMax')) - top
        if is_number(text) and top > h * 0.85:
            continue
        lines.append((top, left, height, text))
    lines.sort(key=lambda l: (round(l[0]), l[1]))
    if not lines:
        return []
    min_left = min(l[1] for l in lines)
    paras, cur, last = [], [], None
    for top, left, height, text in lines:
        same_row = last is not None and abs(top - last[0]) < 2
        new_para = last is not None and not same_row and (
            top - last[0] > max(height, last[2]) * 1.5 or left > min_left + 12 or abs(height - last[2]) > 3
        )
        if new_para and cur:
            paras.append((clean(' '.join(c[1] for c in cur)), max(c[0] for c in cur)))
            cur = []
        cur.append((height, text))
        last = (top, left, height)
    if cur:
        paras.append((clean(' '.join(c[1] for c in cur)), max(c[0] for c in cur)))
    # Words broken across lines with a hyphen.
    return [(re.sub(r'(\w)- (\w)', r'\1\2', p), s) for p, s in paras if p]


def spoken(paras):
    """Paragraphs as one run of words to read aloud: a title gets its own full stop, and the dots that split words into parts go."""
    out = []
    for p, _ in paras:
        p = p.replace('·', '')
        out.append(p if re.search(r'[.!?”’:]$', p) else p + '.')
    return ' '.join(out)


def render(pdf, n, px):
    with tempfile.TemporaryDirectory() as tmp:
        run('pdftoppm', '-f', str(n), '-l', str(n), '-scale-to-x', str(px), '-scale-to-y', '-1', '-png', pdf, os.path.join(tmp, 'p'))
        f = [x for x in os.listdir(tmp) if x.endswith('.png')][0]
        return Image.open(os.path.join(tmp, f)).convert('RGB')


def save(img, folder, name):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, name)
    img.save(path, 'WEBP', quality=QUALITY, method=6)
    return path


def spreads(first, last):
    """Printed pages grouped as an open book shows them: even on the left, odd on the right."""
    groups, p = [], first
    while p <= last:
        if p % 2 == 1 or p == last:
            groups.append([p])
            p += 1
        else:
            groups.append([p, p + 1])
            p += 2
    return groups


def build_picture(pdf, off, book_id, first, last):
    pages, xml = [], text_pages(pdf, first + off, last + off)
    for i, group in enumerate(spreads(first, last)):
        words = spoken([t for p in group for t in page_texts(xml[p + off])])
        # The patterned end paper after a story has no words: leave it out.
        if not words and len(group) == 1 and group[0] == last:
            continue
        imgs = [render(pdf, p + off, PAGE_PX) for p in group]
        w, h = sum(im.width for im in imgs), max(im.height for im in imgs)
        spread = Image.new('RGB', (w, h), 'white')
        x = 0
        for im in imgs:
            spread.paste(im, (x, 0))
            x += im.width
        save(spread, os.path.join(ASSETS, book_id), f'{i:02d}.webp')
        pages.append({'image': f'{book_id}/{i:02d}.webp', 'text': words})
    return pages


def build_chapter(pdf, off, book_id, first, last):
    pages, root = [], page_xml(pdf, first + off, last + off)
    texts = text_pages(pdf, first + off, last + off)
    n = 0
    for page in root.iter('page'):
        num = int(page.get('number'))
        pw, ph = float(page.get('width')), float(page.get('height'))
        paras = [(p.replace('·', ''), s) for p, s in page_texts(texts[num])]
        sizes = [round(s) for _, s in paras]
        body = max(set(sizes), key=lambda x: sum(len(p) for p, s in paras if round(s) == x)) if paras else 0
        heading = ' '.join(p for p, s in paras if round(s) > body + 3) or None
        text = '\n\n'.join(p for p, s in paras if round(s) <= body + 3 and p != 'Chapter')
        if heading:
            heading = tidy_heading(heading)
        # Pictures: the boxes pdftohtml found, cut out of the rendered page. Skip tiny bits and page backgrounds.
        boxes = []
        for im in page.iter('image'):
            t, l, w, h = (float(im.get(k)) for k in ('top', 'left', 'width', 'height'))
            if w < 0 or h < 0:
                l, t, w, h = l + min(w, 0), t + min(h, 0), abs(w), abs(h)
            l, t = max(l, 0), max(t, 0)
            w, h = min(w, pw - l), min(h, ph - t)
            if w * h < pw * ph * 0.06 or w * h > pw * ph * 0.97:
                continue
            boxes.append((l, t, w, h))
        image = None
        if boxes:
            l = min(b[0] for b in boxes)
            t = min(b[1] for b in boxes)
            r = max(b[0] + b[2] for b in boxes)
            b = max(b[1] + b[3] for b in boxes)
            full = render(pdf, num, 1100)
            k = full.width / pw
            crop = full.crop((int(l * k), int(t * k), int(r * k), int(b * k)))
            if crop.width > 900:
                crop = crop.resize((900, int(crop.height * 900 / crop.width)), Image.LANCZOS)
            image = f'{book_id}/{n:02d}.webp'
            save(crop, os.path.join(ASSETS, book_id), f'{n:02d}.webp')
        if not text and not image and not heading:
            continue
        pages.append({'image': image, 'heading': heading, 'text': text})
        n += 1
    return pages


def tidy_heading(h):
    """'Alice's Adventures 4 in Wonderland, Part I' and the like become 'Chapter 4: Alice's Adventures in Wonderland, Part I'."""
    h = re.sub(r'\bChapter\b:?', ' ', h)
    num = re.search(r'(?<![\w,])(\d{1,2})(?![\w,])', h)
    if not num:
        return clean(h)
    rest = clean(h[: num.start()] + ' ' + h[num.end() :]).strip(' :')
    return f'Chapter {num.group(1)}: {rest}' if rest else f'Chapter {num.group(1)}'


def ts_string(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"


def main():
    src = sys.argv[1]
    out = [
        '// Made by scripts/library-books/build.py from the Texas Bluebonnet Learning readers. Do not edit by hand.',
        '/* eslint-disable */',
        "import type { SchoolBook } from '@/utils/schoolBookTypes';",
        '',
        'export const SCHOOL_BOOKS: SchoolBook[] = [',
    ]
    offsets = {}
    only = set(sys.argv[2:])
    for book_id, reader, title, cover, first, last, style in BOOKS:
        if only and book_id not in only:
            continue
        pdf = os.path.join(src, reader + '.pdf')
        if reader not in offsets:
            offsets[reader] = offset_of(pdf)
        off = offsets[reader]
        print(f'{title}: pdf pages {first + off}-{last + off}', file=sys.stderr)
        for f in os.listdir(os.path.join(ASSETS, book_id)) if os.path.isdir(os.path.join(ASSETS, book_id)) else []:
            os.remove(os.path.join(ASSETS, book_id, f))
        build = build_picture if style == 'picture' else build_chapter
        pages = build(pdf, off, book_id, first, last)
        grade, reader_title = READERS[reader]
        out.append('  {')
        out.append(f'    title: {ts_string(title)},')
        out.append(f'    cover: {ts_string(cover)},')
        out.append(f"    level: '{LEVEL.get(grade, 'harder')}',")
        out.append(f'    grade: {ts_string(grade)},')
        out.append(f'    reader: {ts_string(reader_title)},')
        out.append(f"    style: '{style}',")
        out.append('    pages: [')
        for p in pages:
            img = f"require('../../assets/books/{p['image']}')" if p.get('image') else 'undefined'
            heading = f", heading: {ts_string(p['heading'])}" if p.get('heading') else ''
            out.append(f"      {{ image: {img}{heading}, text: {ts_string(p['text'])} }},")
        out.append('    ],')
        out.append('  },')
    out.append('];')
    if only:
        print('\n'.join(out))
        return
    with open(OUT_TS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')


if __name__ == '__main__':
    main()
