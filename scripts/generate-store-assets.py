#!/usr/bin/env python3
"""
Arrow Escape — Play Store Graphics Generator
Generates original, high-resolution store graphics:
1. docs/play-store/assets/app_icon_512.png (512x512)
2. docs/play-store/assets/feature_graphic_1024x500.png (1024x500)
3. docs/play-store/assets/promo_banner_1200x630.png (1200x630)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "play-store", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

def draw_arrow(draw, start, end, shaft_width, head_len, head_width, color):
    """Draws an arrow with a thick shaft and triangular head."""
    x0, y0 = start
    x1, y1 = end
    dx = x1 - x0
    dy = y1 - y0
    dist = math.hypot(dx, dy)
    if dist == 0:
        return
    ux = dx / dist
    uy = dy / dist

    # Tip is at (x1, y1)
    # Base of arrow head is head_len back along unit vector
    bx = x1 - ux * head_len
    by = y1 - uy * head_len

    # Normal vector
    nx = -uy
    ny = ux

    # Left and right wings of head
    w_lx = bx + nx * (head_width / 2.0)
    w_ly = by + ny * (head_width / 2.0)
    w_rx = bx - nx * (head_width / 2.0)
    w_ry = by - ny * (head_width / 2.0)

    # Shaft from start to base
    draw.line([(x0, y0), (bx, by)], fill=color, width=shaft_width)
    # Head polygon
    draw.polygon([(x1, y1), (w_lx, w_ly), (w_rx, w_ry)], fill=color)

def generate_app_icon():
    """Generates a 512x512 high-resolution app icon."""
    size = (512, 512)
    img = Image.new("RGBA", size, (15, 23, 42, 255)) # Dark slate navy #0f172a
    draw = ImageDraw.Draw(img)

    # Subtle inner radial glow
    for r in range(240, 40, -10):
        alpha = int(35 * (1 - r / 240.0))
        draw.ellipse([256 - r, 256 - r, 256 + r, 256 + r], fill=(30, 41, 59, alpha))

    # Decorative grid dots
    grid_spacing = 40
    for gx in range(56, 460, grid_spacing):
        for gy in range(56, 460, grid_spacing):
            draw.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=(51, 65, 85, 180))

    # Central geometric maze arrows
    # 1. Cyan arrow escaping upwards to the right
    draw_arrow(draw, (140, 360), (140, 220), shaft_width=22, head_len=36, head_width=44, color=(99, 102, 241, 255))
    # 2. Horizontal indigo arrow blocking
    draw_arrow(draw, (360, 220), (220, 220), shaft_width=22, head_len=36, head_width=44, color=(168, 85, 247, 255))
    # 3. Escaping Main Arrow (Electric Cyan #06b6d4) breaking free through the top right
    draw_arrow(draw, (200, 340), (370, 340), shaft_width=26, head_len=44, head_width=52, color=(6, 182, 212, 255))
    draw_arrow(draw, (370, 340), (370, 110), shaft_width=26, head_len=44, head_width=52, color=(6, 182, 212, 255))

    # Glow tip around escaping arrow
    draw.ellipse([370 - 12, 110 - 12, 370 + 12, 110 + 12], fill=(6, 182, 212, 120))

    # Outer rounded bezel frame
    draw.rounded_rectangle([16, 16, 496, 496], radius=96, outline=(51, 65, 85, 220), width=6)

    out_path = os.path.join(ASSETS_DIR, "app_icon_512.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path} ({os.path.getsize(out_path)} bytes)")

def generate_feature_graphic():
    """Generates a 1024x500 high-resolution feature graphic."""
    width, height = 1024, 500
    img = Image.new("RGB", (width, height), (15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Ambient background gradient accents
    for x in range(0, width, 8):
        ratio = x / float(width)
        r = int(15 + 15 * ratio)
        g = int(23 + 18 * ratio)
        b = int(42 + 25 * ratio)
        draw.line([(x, 0), (x, height)], fill=(r, g, b))

    # Subtle grid mesh on right half
    grid_size = 32
    for gx in range(540, 980, grid_size):
        for gy in range(60, 440, grid_size):
            draw.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=(51, 65, 85))

    # Board container card on right half
    draw.rounded_rectangle([520, 50, 960, 450], radius=24, fill=(30, 41, 59), outline=(71, 85, 105), width=3)

    # Draw arrows on puzzle board
    draw_arrow(draw, (580, 380), (580, 180), shaft_width=18, head_len=30, head_width=38, color=(99, 102, 241)) # Indigo
    draw_arrow(draw, (880, 220), (660, 220), shaft_width=18, head_len=30, head_width=38, color=(244, 63, 94))  # Rose Red
    draw_arrow(draw, (660, 380), (880, 380), shaft_width=18, head_len=30, head_width=38, color=(16, 185, 129)) # Emerald Green
    # Escaping Cyan arrow
    draw_arrow(draw, (740, 320), (740, 100), shaft_width=22, head_len=36, head_width=44, color=(6, 182, 212))   # Cyan
    # Obstacle block
    draw.rounded_rectangle([640, 270, 680, 310], radius=6, fill=(100, 116, 139), outline=(148, 163, 184), width=2)

    # Typography / Branding on left half
    # Attempt to load a system TTF font, fallback to default
    title_font = None
    sub_font = None
    badge_font = None
    font_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    ]
    for candidate in font_candidates:
        if os.path.exists(candidate):
            title_font = ImageFont.truetype(candidate, 56)
            sub_font = ImageFont.truetype(candidate, 22)
            badge_font = ImageFont.truetype(candidate, 18)
            break

    if not title_font:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        badge_font = ImageFont.load_default()

    # Title & Subtitle text
    draw.text((70, 120), "ARROW ESCAPE", font=title_font, fill=(248, 250, 252))
    draw.text((72, 195), "The Pure Logic Puzzle", font=sub_font, fill=(6, 182, 212))

    # Feature Badges
    badges = ["2,000 Levels", "100% Offline", "No Accounts", "Pure Brain Logic"]
    bx, by = 70, 260
    for badge in badges:
        draw.rounded_rectangle([bx, by, bx + 180, by + 40], radius=12, fill=(30, 41, 59), outline=(51, 65, 85), width=2)
        draw.text((bx + 18, by + 10), badge, font=badge_font, fill=(226, 232, 240))
        bx += 200
        if bx > 400:
            bx = 70
            by += 56

    out_path = os.path.join(ASSETS_DIR, "feature_graphic_1024x500.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path} ({os.path.getsize(out_path)} bytes)")

def generate_promo_banner():
    """Generates a 1200x630 promotional social / website banner."""
    width, height = 1200, 630
    img = Image.new("RGB", (width, height), (15, 23, 42))
    draw = ImageDraw.Draw(img)

    for x in range(0, width, 10):
        ratio = x / float(width)
        draw.line([(x, 0), (x, height)], fill=(int(15 + 20 * ratio), int(23 + 20 * ratio), int(42 + 30 * ratio)))

    out_path = os.path.join(ASSETS_DIR, "promo_banner_1200x630.png")
    img.save(out_path, "PNG")
    print(f"Generated: {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    generate_app_icon()
    generate_feature_graphic()
    generate_promo_banner()
