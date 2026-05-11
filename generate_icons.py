from PIL import Image, ImageDraw

def create_icon(size, path):
    img = Image.new('RGB', (size, size), color = '#4a90e2')
    d = ImageDraw.Draw(img)
    d.ellipse([(size*0.1, size*0.1), (size*0.9, size*0.9)], fill='#ffffff')
    img.save(path)

import os
os.makedirs('/Users/kruemmel/Familien-Skript/static/icons', exist_ok=True)
create_icon(192, '/Users/kruemmel/Familien-Skript/static/icons/icon-192.png')
create_icon(512, '/Users/kruemmel/Familien-Skript/static/icons/icon-512.png')
print("Icons created.")
