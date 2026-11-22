"""Builds the portfolio atlases from media/img/pf16/p-NNN.jpg.

Reads media/img/pf16/, writes only to public/media/atlas/.
  pf-atlas-192.jpg  13x13 cells of 192x108 (2496x1404, q78)  -> C04 Index scene
  pf-atlas-96.jpg   13x13 cells of  96x54  (1248x702,  q66)  -> C01 / boot colour atlas
  pf-atlas.json     {cols, rows, cell, count, ids}
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
SRC = os.path.join(PROJECT, "media", "img", "pf16")
OUT = os.path.join(PROJECT, "public", "media", "atlas")

COLS = ROWS = 13
COUNT = 169


def cover(img, w, h):
    sw, sh = img.size
    scale = max(w / sw, h / sh)
    nw, nh = round(sw * scale), round(sh * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def build(cell_w, cell_h, quality, name):
    atlas = Image.new("RGB", (COLS * cell_w, ROWS * cell_h), (232, 229, 219))
    for i in range(COUNT):
        path = os.path.join(SRC, f"p-{i:03d}.jpg")
        if not os.path.exists(path):
            print(f"missing {path}", file=sys.stderr)
            sys.exit(1)
        with Image.open(path) as im:
            tile = cover(im.convert("RGB"), cell_w, cell_h)
        atlas.paste(tile, ((i % COLS) * cell_w, (i // COLS) * cell_h))
    dst = os.path.join(OUT, name)
    atlas.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"{name}: {atlas.size[0]}x{atlas.size[1]} {os.path.getsize(dst) // 1024}KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    build(192, 108, 78, "pf-atlas-192.jpg")
    # q66 keeps the small atlas inside the 160KB budget (q72 lands at ~173KB)
    build(96, 54, 66, "pf-atlas-96.jpg")
    meta = {
        "cols": COLS,
        "rows": ROWS,
        "count": COUNT,
        "cell": {"192": [192, 108], "96": [96, 54]},
        "ids": list(range(COUNT)),
    }
    with open(os.path.join(OUT, "pf-atlas.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f)
    print("pf-atlas.json written")


if __name__ == "__main__":
    main()
