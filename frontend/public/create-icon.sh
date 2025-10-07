#!/bin/bash
# SVG'yi PNG'ye çeviriyoruz (ImageMagick veya rsvg-convert gerekli)
if command -v convert &> /dev/null; then
    convert -background none -size 512x512 icon.svg icon.png
    echo "✅ icon.png oluşturuldu (ImageMagick)"
elif command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w 512 -h 512 icon.svg -o icon.png
    echo "✅ icon.png oluşturuldu (rsvg-convert)"
else
    echo "⚠️ ImageMagick veya rsvg-convert bulunamadı"
    echo "Manuel olarak icon.svg'yi icon.png'ye çevirmeniz gerekebilir"
fi
