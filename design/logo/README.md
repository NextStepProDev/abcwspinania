# Logo source material

Neither of these is a usable logo file. They are the only images of the mark
that exist, and they are what the vector tracing in `web/src/lib/mark.ts` was
drawn from. They are kept out of `web/public` on purpose — nothing on the site
loads them, and they should not ship inside the application image.

| File | What it is |
|---|---|
| `ABC_logo.png` | The old site's banner, 360×180. The mark sits inside it at roughly 90×84 px and is eaten by compression. This is the file referenced as `images/modules/ABC_logo.png` on the old site. |
| `ABCWSPINANIA.jpg` | A wider banner, 980×300, with the mark photographed on a signpost. Supplied 24.09.2026 and a far better reference — the rounded corners of the diamond are only legible here. |

## What these show that the site does not

The real mark is **blue** — navy on the signpost, lighter blue in the banner —
with a white figure. The site draws it in `currentColor` in the header and in
the orange accent on the favicon and the social card. That orange comes from
the mockup's palette, not from the school's logo.

It was left as it is deliberately: the whole palette is built around that
accent, and changing the mark's colour is a decision for the client, not a
side effect of improving a tracing. Raised with him as an open question.

The mark also carries the wordmark `ABCWSPINANIA.INFO` beneath the diamond.
The site does not reproduce it anywhere.

**Still missing: the logo as a vector (AI/EPS/SVG).** `ZAKRES.md`, item 4.
