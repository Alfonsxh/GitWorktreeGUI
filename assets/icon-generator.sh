#!/bin/bash

# Icon Generator Script for Git Worktree GUI
# This script generates all required icon sizes from a base 1024x1024 PNG

BASE_ICON="icon.png"

if [ ! -f "$BASE_ICON" ]; then
    echo "Creating placeholder icon..."
    # Create a simple placeholder using ImageMagick (if available)
    if command -v convert &> /dev/null; then
        convert -size 1024x1024 xc:white \
            -fill black -gravity center \
            -pointsize 200 -annotate +0+0 'GW' \
            -bordercolor black -border 50 \
            "$BASE_ICON"
    else
        echo "Please provide a 1024x1024 PNG icon as $BASE_ICON"
        exit 1
    fi
fi

# Generate Windows icon
if command -v convert &> /dev/null; then
    echo "Generating Windows icon..."
    convert "$BASE_ICON" -resize 256x256 icon.ico
fi

# Generate macOS icon set
if command -v iconutil &> /dev/null; then
    echo "Generating macOS icon..."
    mkdir -p icon.iconset
    sips -z 16 16     "$BASE_ICON" --out icon.iconset/icon_16x16.png
    sips -z 32 32     "$BASE_ICON" --out icon.iconset/icon_16x16@2x.png
    sips -z 32 32     "$BASE_ICON" --out icon.iconset/icon_32x32.png
    sips -z 64 64     "$BASE_ICON" --out icon.iconset/icon_32x32@2x.png
    sips -z 128 128   "$BASE_ICON" --out icon.iconset/icon_128x128.png
    sips -z 256 256   "$BASE_ICON" --out icon.iconset/icon_128x128@2x.png
    sips -z 256 256   "$BASE_ICON" --out icon.iconset/icon_256x256.png
    sips -z 512 512   "$BASE_ICON" --out icon.iconset/icon_256x256@2x.png
    sips -z 512 512   "$BASE_ICON" --out icon.iconset/icon_512x512.png
    sips -z 1024 1024 "$BASE_ICON" --out icon.iconset/icon_512x512@2x.png
    iconutil -c icns icon.iconset
    rm -rf icon.iconset
fi

# Generate Linux icons
echo "Generating Linux icons..."
for size in 16 24 32 48 64 128 256 512 1024; do
    if command -v convert &> /dev/null; then
        convert "$BASE_ICON" -resize ${size}x${size} ${size}x${size}.png
    fi
done

echo "Icon generation complete!"