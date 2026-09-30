# Logo source material

Kept out of `web/public` on purpose — nothing on the site loads these files,
and they should not ship inside the application image.

| File | What it is |
|---|---|
| `logo-abc-wspinania.pdf` | **The original logo, as a vector** (CorelDRAW 9). Supplied by the client on 30.09.2026. The single source of every shape in `web/src/lib/mark.ts` and of the accent colour, RGB 0/72/146 = `#004892`. |
| `extract.py` | Turns that PDF into the path data in `mark.ts`. Usage is in its docstring. |
| `ABC_logo.png` | The old site's banner, 360×180, with the mark at roughly 90×84 px — served there as `images/modules/ABC_logo.png`. What the first, hand-drawn tracing was made from. Kept for the record; keep that path too, it is the only note in the repository of where the file came from. |
| `ABCWSPINANIA.jpg` | The mark photographed on a signpost, 980×300. The second reference for the tracing — the one the old navy accent (`#1b2c71`) was sampled from. The photo reads darker and more violet than the real logo. |

## What the site uses

- **Header:** the sign alone (lozenge + climber) next to the name set in the
  site's type. The full logo would be too small to read at that height.
- **Home page hero:** the full logo standing BEHIND the rock in the photo,
  from `xl` up (`web/src/components/HeroSign.tsx`, masked by a sky map of that
  one photo in `web/public/images/hero/`). Below `xl` the rock is out of frame
  and the logo stands at the section's bottom edge instead. With a different
  hero photo the scene switches itself off — rule 27 in `CLAUDE.md`.
- **About page:** the full logo as a seal beside the school's age and licence.
- **Watermark:** the sign, large and pale, behind "Dlaczego instruktor z
  licencją" (home) and "Dlaczego licencja PZA ma znaczenie" (about) —
  `SignWatermark` in `web/src/components/Logo.tsx`.
- **404 page:** the sign above the message.
- **Footer:** the full logo, with the ABCWSPINANIA.INFO plate, beside the
  school's description.
- **Browser tab, iPhone and Android home screen, social card:** the sign,
  generated from code — see `web/src/lib/sign-icon.tsx` and `og/route.tsx`.

The sign on its own does not exist in the PDF: the lozenge's bottom corner is
hidden behind the plate. `extract.py` completes it — see the comment at the
top of `mark.ts`.

## Other files from the client, deliberately not used

Delivered alongside the PDF on 30.09.2026 and left out:


- a T-shirt design (ABC over mountains, rope and stars) — merchandise, not
  the school's mark;
- banners that contain the same logo as a bitmap, at worse quality than the PDF;
- the PZA licence confirmation (the association's logo on a certificate
  naming a person). The licence number is already shown as text in the footer.

## The round "ABC Wspinania" sticker

`web/public/images/decor/abc-kolo.png` — from `Abc 2024.pdf` (a mountain
photo in a circle, "ABC WSPINANIA" and "kursy wspinaczkowe, obozy,
wspinaczka rekreacyjna" around it). Used ONCE, 30.09.2026: barely visible in
the dark header of `/obozy`, as texture rather than as a second logo — the
lozenge stays the school's only mark. Rendered from the PDF with its own
transparency, cropped to a clean circle and turned grayscale (a choice, so its
teal does not tint the warm near-black), 900 × 900.

The photo in it looks like stock (the Alps, not the Jura); whether the school
has the rights to it is to be confirmed (`ZAKRES.md`).

## The "Instruktor PZA" badge

`web/public/images/pza/instruktor-pza.png`, used in the footer beside the
logo and in the home page hero beside the logo, behind the rock with it
(`HeroSign.tsx`, `PZA_BADGE`). Added 30.09.2026 at the
client's request; whether PZA's rules allow it on the school's site is still
to be confirmed (`ZAKRES.md`).

Cut from `FB_IMG_1577089284290.jpg` (1762 × 1756, the badge on white), not
from the 500 px remove.bg preview that came with it: the badge is a clean
circle, so the background was removed with a circular alpha (supersampled
edge, 2 px inside the rim to drop the white fringe) and the result scaled to
800 × 800. `instruktor-pza-440.webp` is a 440 px copy for the hero's SVG
scene, which bypasses Next's image optimizer (see `PZA_BADGE_SCENE`). If a
better photo of the badge turns up, redo it the same way, regenerate the copy,
and give both files new names (rule 13 in `CLAUDE.md`).

## The Polish Mountaineering Association (PZA) logo

`web/public/images/pza/pza-logo.png`, on `/kursy` beside the sentence about
the PZA programme. Added 30.09.2026 at the client's request — this is the
ASSOCIATION's own logo, not the instructor badge, and on a school's site it
reads as "partner of PZA"; the association's permission is item 10 in
`ZAKRES.md`. From `PZA-logo.png` (1155 × 722, already transparent — only the
empty margins were cropped, to 1108 × 632).
