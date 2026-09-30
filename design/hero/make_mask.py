"""Build the sky mask for the home page hero ("logo behind the rock").

Usage (outside the app — these are not project dependencies):

    python3 -m venv /tmp/hero-venv
    /tmp/hero-venv/bin/pip install pillow numpy
    /tmp/hero-venv/bin/python design/hero/make_mask.py <photo.jpg> <out.png>

Opaque = sky (the logo shows), transparent = rock, trees, the climber (the
logo hides). The output goes to web/public/images/hero/; the logo's
coordinates in web/src/components/HeroSign.tsx are read off the same photo —
see the comment there, and rule 27 in CLAUDE.md.

The sky is picked by colour: blue, and well bluer than red and green. That
works for a clear sky; clouds or a white sky need another rule.
"""

import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps


def main(src, out):
    # EXIF first: the original hero photo is stored rotated 180° with an
    # orientation flag, which browsers apply and raw pixel access does not.
    image = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    rgb = np.asarray(image).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sky = (b > 120) & (b - r > 60) & (b - g > 15)

    mask = Image.fromarray((sky * 255).astype('uint8'))
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))  # fill specks in the sky
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # drop specks in the trees
    mask = mask.filter(ImageFilter.GaussianBlur(1.5))

    # White, with the sky map as ALPHA — one file that works as both kinds of
    # mask: an SVG <mask> reads luminance (white × alpha = the map), a CSS
    # `mask-image` reads alpha. A plain grayscale PNG is opaque everywhere,
    # which CSS would read as "show all".
    half = mask.resize((image.width // 2, image.height // 2), Image.LANCZOS)
    white = Image.new('L', half.size, 255)
    Image.merge('LA', (white, half)).save(out, optimize=True)


if __name__ == '__main__':
    main(*sys.argv[1:3])
