"""Generate Strait Link's Play Store graphics + Android launcher icons.

    python make_assets.py   (needs Pillow; macOS `sips` rasterises the SVG icon)

The icon is the Strait brand app icon (orange tile, dark mark) from
../../../brand/icons/app-icon-1024.svg, never redrawn here.

Outputs (this folder): icon-512.png, feature-1024x500.png; and the launcher
icons in ../android/app/src/main/res/mipmap-*/ic_launcher(_round).png.
Store screenshots (screenshots/) are real phone captures (adb exec-out screencap).
"""
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
RES = HERE.parent / "android/app/src/main/res"
APP_ICON_SVG = HERE.parents[2] / "brand/icons/app-icon-1024.svg"

# Strait tokens (brand/tokens/strait.tokens.json)
INK = (28, 20, 16)          # neutral-950 / on-brand
INK_DEEP = (18, 16, 16)     # neutral-1000 (dark bg)
TEXT_ON_DARK = (246, 241, 236)
ORANGE_300 = (255, 174, 109)
FONT_BOLD = "/System/Library/Fonts/Avenir Next.ttc"


def master_icon() -> Image.Image:
    """Rasterise the brand SVG once at 1024 px."""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "icon.png"
        subprocess.run(["sips", "-s", "format", "png", "-z", "1024", "1024", str(APP_ICON_SVG), "--out", str(out)],
                       check=True, capture_output=True)
        return Image.open(out).convert("RGBA")


def icon(master: Image.Image, size: int, shape: str = "square") -> Image.Image:
    """App icon. Play wants a full-bleed square (it applies its own mask)."""
    img = master.resize((size, size), Image.LANCZOS)
    if shape != "square":
        mask = Image.new("L", (size * 4, size * 4), 0)
        md = ImageDraw.Draw(mask)
        if shape == "round":
            md.ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
        else:  # rounded (legacy launcher)
            md.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size * 4 // 5, fill=255)
        img.putalpha(mask.resize((size, size), Image.LANCZOS))
    return img


def feature(master: Image.Image) -> Image.Image:
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    for x in range(W):  # subtle left→right shade, warm ink to deepest ink
        t = x / W
        d.line([x, 0, x, H], fill=tuple(int(INK[i] * (1 - t) + INK_DEEP[i] * t) for i in range(3)))
    tile = icon(master, 280, "rounded")
    img.paste(tile, (80, 110), tile)
    title = ImageFont.truetype(FONT_BOLD, 88, index=0)
    sub = ImageFont.truetype(FONT_BOLD, 36, index=0)
    d.text((418, 150), "Strait Link", font=title, fill=TEXT_ON_DARK)
    d.text((422, 268), "Test every way a link", font=sub, fill=ORANGE_300)
    d.text((422, 314), "opens your app", font=sub, fill=ORANGE_300)
    return img


if __name__ == "__main__":
    m = master_icon()
    icon(m, 512).convert("RGB").save(HERE / "icon-512.png")          # opaque, full-bleed
    feature(m).save(HERE / "feature-1024x500.png")
    for folder, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
        icon(m, px, "rounded").save(RES / f"mipmap-{folder}/ic_launcher.png")
        icon(m, px, "round").save(RES / f"mipmap-{folder}/ic_launcher_round.png")
    print("ok")
