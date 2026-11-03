#!/usr/bin/env python3
"""
Generates production-quality launcher icons and splash screens for Arrow Escape.
Creates:
  - mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png (square / rounded rect)
  - mipmap-{mdpi,hdpi,xxhdpi,xxxhdpi}/ic_launcher_round.png (circular)
  - mipmap-{mdpi,hdpi,xxhdpi,xxxhdpi}/ic_launcher_foreground.png (adaptive)
  - drawable/splash.png
  - drawable-port-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash.png
  - drawable-land-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splash.png
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

RES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../android/app/src/main/res"))

# Color Palette
BG_COLOR = (15, 23, 42, 255)         # #0f172a Deep Slate Navy
CHAMBER_BORDER = (51, 65, 85, 255)    # #334155
CHAMBER_FILL = (30, 41, 59, 255)      # #1e293b
ARROW_TRAIL = (99, 102, 241, 255)     # #6366f1 Indigo
ARROW_HEAD = (56, 189, 248, 255)      # #38bdf8 Cyan
ARROW_ACCENT = (244, 63, 94, 255)     # #f43f5e Rose
SPARK_COLOR = (56, 189, 248, 220)
TEXT_COLOR = (248, 250, 252, 255)     # #f8fafc
SUBTEXT_COLOR = (148, 163, 184, 255)  # #94a3b8

def draw_emblem(draw, center_x, center_y, size, is_foreground=False):
    """Draws the Arrow Escape geometric maze emblem centered at (center_x, center_y)."""
    s = size / 100.0  # scale factor relative to 100 unit box
    
    # Outer maze chamber (with escape gate opening at top right)
    # Box bounds: left: 24, top: 24, right: 76, bottom: 76
    x0, y0 = center_x - 30 * s, center_y - 28 * s
    x1, y1 = center_x + 24 * s, center_y + 26 * s
    r = 7 * s
    stroke = max(2, int(3.5 * s))
    
    # Chamber walls: left, bottom, right up to gate (y = y0 + 18*s), top left up to gate (x = center_x + 10*s)
    gate_y = center_y - 8 * s
    gate_x = center_x + 10 * s
    
    # Draw chamber perimeter with escape gap at top-right
    # Left wall
    draw.line([(x0, y0 + r), (x0, y1 - r)], fill=CHAMBER_BORDER, width=stroke)
    # Bottom wall
    draw.line([(x0 + r, y1), (x1 - r, y1)], fill=CHAMBER_BORDER, width=stroke)
    # Right wall (from bottom corner up to gate opening)
    draw.line([(x1, y1 - r), (x1, gate_y)], fill=CHAMBER_BORDER, width=stroke)
    # Top wall (from left corner up to gate opening)
    draw.line([(x0 + r, y0), (gate_x, y0)], fill=CHAMBER_BORDER, width=stroke)
    
    # Rounded corners
    draw.arc([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=CHAMBER_BORDER, width=stroke)
    draw.arc([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=CHAMBER_BORDER, width=stroke)
    draw.arc([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=CHAMBER_BORDER, width=stroke)
    
    # Obstacle dots inside chamber
    obs_size = max(2, int(4 * s))
    for ox, oy in [(-16, -6), (-16, 10), (6, 16)]:
        px, py = center_x + ox * s, center_y + oy * s
        draw.rounded_rectangle([px, py, px + obs_size, py + obs_size], radius=max(1, int(s)), fill=CHAMBER_BORDER)
        
    # Escaping Arrow L-shaped track: from (center_x - 10*s, center_y + 16*s) -> (center_x - 6*s, center_y - 2*s) -> through gate
    arrow_stroke = max(3, int(5.5 * s))
    p1 = (center_x - 12 * s, center_y + 14 * s)
    p2 = (center_x - 6 * s, center_y + 14 * s)
    p3 = (center_x - 6 * s, center_y - 8 * s)
    p4 = (center_x + 22 * s, center_y - 8 * s)
    
    draw.line([p1, p2], fill=ARROW_TRAIL, width=arrow_stroke)
    draw.line([p2, p3], fill=ARROW_TRAIL, width=arrow_stroke)
    draw.line([p3, p4], fill=ARROW_TRAIL, width=arrow_stroke)
    
    # Arrow base accent dot
    base_r = max(2, int(3 * s))
    draw.ellipse([p1[0] - base_r, p1[1] - base_r, p1[0] + base_r, p1[1] + base_r], fill=ARROW_ACCENT)
    
    # Arrow extraction head (chevron tip pointing right and breaking out)
    tip_x, tip_y = center_x + 32 * s, center_y - 8 * s
    head_back_x = center_x + 19 * s
    head_half_h = 10 * s
    
    triangle = [
        (tip_x, tip_y),
        (head_back_x, tip_y - head_half_h),
        (head_back_x + 3 * s, tip_y),
        (head_back_x, tip_y + head_half_h)
    ]
    draw.polygon(triangle, fill=ARROW_HEAD)
    
    # Energy spark particles breaking into freedom
    for sx, sy, sr in [(34, -18, 1.8), (38, 0, 1.6), (28, -25, 1.5)]:
        spx, spy = center_x + sx * s, center_y + sy * s
        draw.ellipse([spx - sr*s, spy - sr*s, spx + sr*s, spy + sr*s], fill=SPARK_COLOR)

def create_launcher_icon(size, is_round=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if is_round:
        draw.ellipse([0, 0, size, size], fill=BG_COLOR)
        # Subtle rim
        draw.ellipse([1, 1, size-2, size-2], outline=CHAMBER_BORDER, width=max(1, size // 48))
    else:
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=BG_COLOR)
        draw.rounded_rectangle([1, 1, size-2, size-2], radius=radius, outline=CHAMBER_BORDER, width=max(1, size // 48))
        
    draw_emblem(draw, size / 2, size / 2, size * 0.85)
    return img

def create_foreground_icon(size):
    # 108dp adaptive foreground with transparent background; safe zone is center 66%
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_emblem(draw, size / 2, size / 2, size * 0.65, is_foreground=True)
    return img

def create_splash_screen(width, height):
    img = Image.new("RGBA", (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Subtle background geometric grid in center
    cx, cy = width / 2, height / 2 - height * 0.04
    emblem_size = min(width, height) * 0.38
    draw_emblem(draw, cx, cy, emblem_size)
    
    # Typography: "ARROW ESCAPE" and "OFFLINE PUZZLE"
    text_y = cy + emblem_size * 0.65
    
    # Draw simple clean vector lettering if default font
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(min(width, height) * 0.055))
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(min(width, height) * 0.026))
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    title = "ARROW ESCAPE"
    sub = "OFFLINE PUZZLE"
    
    # Title
    t_bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = t_bbox[2] - t_bbox[0]
    draw.text((cx - tw / 2, text_y), title, font=font_title, fill=TEXT_COLOR)
    
    # Subtitle
    s_bbox = draw.textbbox((0, 0), sub, font=font_sub)
    sw = s_bbox[2] - s_bbox[0]
    draw.text((cx - sw / 2, text_y + (t_bbox[3] - t_bbox[1]) + 8), sub, font=font_sub, fill=SUBTEXT_COLOR)
    
    return img

def main():
    densities = {
        "mdpi": {"icon": 48, "fg": 108},
        "hdpi": {"icon": 72, "fg": 162},
        "xhdpi": {"icon": 96, "fg": 216},
        "xxhdpi": {"icon": 144, "fg": 324},
        "xxxhdpi": {"icon": 192, "fg": 432}
    }
    
    # 1. Launcher Icons
    for d, sizes in densities.items():
        folder = os.path.join(RES_DIR, f"mipmap-{d}")
        os.makedirs(folder, exist_ok=True)
        
        # ic_launcher.png
        icon = create_launcher_icon(sizes["icon"], is_round=False)
        icon.save(os.path.join(folder, "ic_launcher.png"), "PNG")
        
        # ic_launcher_round.png
        icon_round = create_launcher_icon(sizes["icon"], is_round=True)
        icon_round.save(os.path.join(folder, "ic_launcher_round.png"), "PNG")
        
        # ic_launcher_foreground.png
        fg = create_foreground_icon(sizes["fg"])
        fg.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG")
        
        print(f"Generated icons for {d} (icon: {sizes['icon']}px, fg: {sizes['fg']}px)")
        
    # 2. Splash Screens
    # Main drawable/splash.png
    splash_main = create_splash_screen(480, 480)
    splash_main.save(os.path.join(RES_DIR, "drawable", "splash.png"), "PNG")
    print("Generated drawable/splash.png (480x480)")
    
    # Port / Land densities
    splash_sizes = {
        "port-mdpi": (320, 480),
        "port-hdpi": (480, 800),
        "port-xhdpi": (720, 1280),
        "port-xxhdpi": (960, 1600),
        "port-xxxhdpi": (1080, 1920),
        "land-mdpi": (480, 320),
        "land-hdpi": (800, 480),
        "land-xhdpi": (1280, 720),
        "land-xxhdpi": (1600, 960),
        "land-xxxhdpi": (1920, 1080),
    }
    
    for name, (w, h) in splash_sizes.items():
        folder = os.path.join(RES_DIR, f"drawable-{name}")
        os.makedirs(folder, exist_ok=True)
        s = create_splash_screen(w, h)
        s.save(os.path.join(folder, "splash.png"), "PNG")
        print(f"Generated drawable-{name}/splash.png ({w}x{h})")
        
    print("\n✅ All original Android launcher icons and splash screens successfully generated!")

if __name__ == "__main__":
    main()
