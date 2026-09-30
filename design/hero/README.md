# Home page hero photo

Kept out of `web/public` on purpose: the hero photo lives in the CMS (Media),
not in the repository. These files are how it was prepared.

| File | What it is |
|---|---|
| `20240828_134954-retusz.jpg` | The hero photo with a dark blur (something in front of the lens) painted out of the bottom-right corner, 30.09.2026. Saved upright, no EXIF rotation. **This is the file to upload in the panel.** |
| `make_mask.py` | Builds the sky mask in `web/public/images/hero/` for the "logo behind the rock" scene. Usage in its docstring. |

## Putting the retouched photo on a server

The site reads the hero photo from the panel, so every server (local,
production) needs this step once. A code deploy does not do it.

1. Panel → **Media** → upload `20240828_134954-retusz.jpg` as a NEW item.
   Copy the alt text from the old photo if it had one. Leave the focal point
   in the middle — the rock scene switches itself off otherwise.
2. Panel → **Strona główna** → hero photo field → pick the new item → save.
3. Check the home page: the dark blur in the bottom-right corner is gone and
   the logo still stands behind the rock (from 1280 px wide).

A new file rather than overwriting the old one on disk, because the address
is the cache key: Payload keeps the filename in the URL, and the photo is
cached for 30 days by Next's image optimizer and for a month by browsers
(rule 13 in `CLAUDE.md`). The same address with new contents would keep
showing the old picture; a new name is fetched fresh everywhere.

The old item can be deleted from Media afterwards, once nothing points to it.

## The mask fits both files

The retouch only touched bushes, so the sky mask made from the original fits
the retouched photo too (measured: 0.14% of pixels differ, along edges, from
the JPEG re-encode). `HeroSign.tsx` accepts both filenames, so the scene works
before and after the swap.
