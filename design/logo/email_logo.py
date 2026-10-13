"""Render the logo for email headers from the original vector, unchanged.

Usage (outside the app — not a project dependency):

    python3 -m venv /tmp/logo-venv
    /tmp/logo-venv/bin/pip install pymupdf
    /tmp/logo-venv/bin/python design/logo/email_logo.py

Writes web/public/logo/email-logo.png: the whole logo exactly as drawn in
the PDF (blue panel, sign, ABCWSPINANIA.INFO plate) — no crop inside it, no
completed lozenge, no recolouring. Emails cannot show SVG (Gmail, Outlook),
so it is a PNG, at twice the size it is shown (57 px wide) for sharp phone
screens; the email sets only the width, so it is never squeezed. Clipped to
the bounds of the blue panel, shape 1 in the PDF (see extract.py); the page's
white background around it stays white, as the email header is.
"""

from pathlib import Path

import fitz

HERE = Path(__file__).parent
PDF = HERE / 'logo-abc-wspinania.pdf'
OUT = HERE.parent.parent / 'web' / 'public' / 'logo' / 'email-logo.png'
HEIGHT = 128  # px; shown at 64

page = fitz.open(PDF)[0]
panel = page.get_drawings()[1]['rect']
zoom = HEIGHT / panel.height
pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=panel, alpha=False)
pix.save(OUT)
print(f'{OUT}: {pix.width} x {pix.height}')
