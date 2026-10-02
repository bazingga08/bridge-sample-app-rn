"""Generate Bridge Link's Play Store graphics + Android launcher icons.

    python make_assets.py   (needs Pillow)

Outputs (this folder): icon-512.png, feature-1024x500.png; and the launcher
icons in ../android/app/src/main/res/mipmap-*/ic_launcher(_round).png.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
RES = HERE.parent / "android/app/src/main/res"
GREEN = (11, 107, 87)
GREEN_DARK = (8, 78, 64)
WHITE = (255, 255, 255)
MINT = (190, 232, 219)
FONT_BOLD = "/System/Library/Fonts/Avenir Next.ttc"


def bridge_glyph(size: int, color=WHITE) -> Image.Image:
    """A bridge arch over a deck with two towers, drawn at 4x then downscaled."""
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = int(s * 0.075)                      # stroke width
    left, right = int(s * 0.16), int(s * 0.84)
    deck_y = int(s * 0.64)
    # arch: top half of an ellipse
    d.arc([left, int(s * 0.30), right, int(s * 0.98)], start=180, end=360, fill=color, width=w)
    # deck
    d.rounded_rectangle([int(s * 0.10), deck_y - w // 2, int(s * 0.90), deck_y + w // 2], radius=w // 2, fill=color)
    # towers rising from the deck to the arch ends
    for x in (left, right - w):
        d.rounded_rectangle([x, int(s * 0.62), x + w, int(s * 0.80)], radius=w // 3, fill=color)
    # hangers: from the arch (point on the ellipse at this x) down to the deck
    cx, cy = (left + right) / 2, s * 0.64
    rx, ry = (right - left) / 2, s * 0.34
    for fx in (0.33, 0.5, 0.67):
        x = s * fx
        y_arch = cy - ry * (1 - ((x - cx) / rx) ** 2) ** 0.5
        d.line([int(x), int(y_arch + w * 0.9), int(x), deck_y], fill=color, width=max(2, w // 3))
    return img.resize((size, size), Image.LANCZOS)


def icon(size: int, shape: str = "square") -> Image.Image:
    """App icon. Play wants a full-bleed square (it applies its own mask)."""
    base = Image.new("RGBA", (size, size), GREEN + (255,))
    if shape != "square":
        mask = Image.new("L", (size * 4, size * 4), 0)
        md = ImageDraw.Draw(mask)
        if shape == "round":
            md.ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
        else:  # rounded (legacy launcher)
            md.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size * 4 // 5, fill=255)
        base.putalpha(mask.resize((size, size), Image.LANCZOS))
    glyph = bridge_glyph(int(size * 0.78))
    off = (size - glyph.width) // 2
    base.alpha_composite(glyph, (off, off - int(size * 0.07)))
    return base


def feature() -> Image.Image:
    W, H = 1024, 500
    img = Image.new("RGB", (W, H), GREEN)
    d = ImageDraw.Draw(img)
    for x in range(W):  # subtle left→right shade
        t = x / W
        d.line([x, 0, x, H], fill=tuple(int(GREEN[i] * (1 - t) + GREEN_DARK[i] * t) for i in range(3)))
    g = bridge_glyph(300)
    img.paste(g, (70, 100), g)
    title = ImageFont.truetype(FONT_BOLD, 92, index=0)
    sub = ImageFont.truetype(FONT_BOLD, 38, index=0)
    d.text((410, 150), "Bridge Link", font=title, fill=WHITE)
    d.text((414, 270), "Test every way a link", font=sub, fill=MINT)
    d.text((414, 318), "opens your app", font=sub, fill=MINT)
    return img


if __name__ == "__main__":
    icon(512).convert("RGB").save(HERE / "icon-512.png")          # 32-bit not needed; opaque
    feature().save(HERE / "feature-1024x500.png")
    for folder, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
        icon(px, "rounded").save(RES / f"mipmap-{folder}/ic_launcher.png")
        icon(px, "round").save(RES / f"mipmap-{folder}/ic_launcher_round.png")
    print("ok")
