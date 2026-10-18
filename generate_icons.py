#!/usr/bin/env python3
"""
Generate PNG icons for Daily Planner PWA
Creates 192x192 and 512x512 icons with a checkmark design
"""

from PIL import Image, ImageDraw
import os

# Create icons directory if it doesn't exist
icons_dir = "icons"
if not os.path.exists(icons_dir):
    os.makedirs(icons_dir)
    print(f"✓ Created '{icons_dir}' directory")

# Icon configuration
colors = {
    "bg_primary": "#2c3e50",  # Dark blue-gray for regular icons
    "bg_maskable": "#3498db",  # Brighter blue for maskable icons
    "fg": "#ffffff",            # White text
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_icon(size, bg_color, filename):
    """Create a PNG icon with checkmark"""
    # Create image
    img = Image.new("RGB", (size, size), hex_to_rgb(bg_color))
    draw = ImageDraw.Draw(img)
    
    # Calculate checkmark coordinates
    # Draw a checkmark in the center
    margin = size // 6
    check_left = int(size * 0.25)
    check_mid = int(size * 0.45)
    check_right = int(size * 0.75)
    check_top = int(size * 0.35)
    check_bottom = int(size * 0.65)
    
    # Draw checkmark with thick lines
    line_width = max(1, size // 24)
    
    # Left diagonal of checkmark (going down-right)
    draw.line(
        [(check_left, check_mid), (check_mid, check_bottom)],
        fill=hex_to_rgb(colors["fg"]),
        width=line_width
    )
    
    # Right diagonal of checkmark (going up-right)
    draw.line(
        [(check_mid, check_bottom), (check_right, check_top)],
        fill=hex_to_rgb(colors["fg"]),
        width=line_width
    )
    
    # Save icon
    img.save(filename)
    print(f"✓ Created {filename} ({size}x{size})")

# Generate icons
try:
    # Create regular icons
    create_icon(192, colors["bg_primary"], f"{icons_dir}/icon-192.png")
    create_icon(512, colors["bg_primary"], f"{icons_dir}/icon-512.png")
    
    # Create maskable icon (different background color for visual variety)
    create_icon(192, colors["bg_maskable"], f"{icons_dir}/icon-192-maskable.png")
    
    print("\n✅ All icons created successfully!")
    print(f"\nIcons are in the '{icons_dir}' folder:")
    print(f"  • icon-192.png (regular icon)")
    print(f"  • icon-512.png (app home screen icon)")
    print(f"  • icon-192-maskable.png (adaptive icon)")
    
except ImportError:
    print("❌ Error: PIL (Pillow) not installed")
    print("\nTo install, run:")
    print("  pip install Pillow")
    print("\nOr install via Homebrew:")
    print("  brew install python-pillow")
except Exception as e:
    print(f"❌ Error creating icons: {e}")
