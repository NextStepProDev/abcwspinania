"""Extract the logo geometry for web/src/lib/mark.ts from the original vector.

Usage (outside the app — these are not project dependencies):

    python3 -m venv /tmp/logo-venv
    /tmp/logo-venv/bin/pip install pymupdf skia-pathops
    /tmp/logo-venv/bin/python design/logo/extract.py

Prints the values of MARK_PATH, FULL_LOGO_VIEW_BOX and FULL_LOGO as JSON;
paste them into mark.ts. The output is deterministic, so running this again
on an unchanged PDF must reproduce the file exactly — a quick way to confirm
nobody hand-edited the numbers.

The PDF holds five filled shapes (CorelDRAW 9, all even-odd):
  0  white page background — ignored
  1  blue panel, with the lozenge's left corner and the plate's border
  2  white lozenge; the climber is a notch in its outline
  3  white plate
  4  blue wordmark ABCWSPINANIA.INFO
"""

import json
from pathlib import Path

import fitz
import pathops

PDF = Path(__file__).with_name('logo-abc-wspinania.pdf')

# Indices into shape 2's segment list, read off a dump of its items.
FIGURE = slice(1, 32)  # from the right leg's foot, round the figure, to the left
LEFT_CORNER, LEFT_EDGE, TOP_CORNER, RIGHT_EDGE, RIGHT_CORNER = 34, 35, 36, 37, 38

# The legs are extended straight down to this y, well past the completed
# lozenge's bottom tip, so the subtraction cuts cleanly through it.
LEG_END_Y = 540


def points(item):
    return [p for p in item[1:] if isinstance(p, fitz.Point)]


def append(path, items):
    """Append connected line/curve segments as closed contours."""
    prev = None
    for item in items:
        if item[0] == 're':
            r = item[1]
            path.moveTo(r.x0, r.y0)
            path.lineTo(r.x1, r.y0)
            path.lineTo(r.x1, r.y1)
            path.lineTo(r.x0, r.y1)
            path.close()
            prev = None
            continue
        pts = points(item)
        if prev is None or abs(pts[0].x - prev.x) + abs(pts[0].y - prev.y) > 0.01:
            if prev is not None:
                path.close()
            path.moveTo(pts[0].x, pts[0].y)
        if item[0] == 'l':
            path.lineTo(pts[1].x, pts[1].y)
        elif item[0] == 'c':
            path.cubicTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y)
        else:
            raise ValueError(f'unexpected segment {item[0]!r}')
        prev = pts[-1]
    if prev is not None:
        path.close()


def shape(drawing):
    """An even-odd PDF fill as a non-overlapping path."""
    path = pathops.Path(fillType=pathops.FillType.EVEN_ODD)
    append(path, drawing['items'])
    return pathops.simplify(path, fix_winding=True)


def svg(path, dx, dy, scale):
    fmt = lambda v: f'{round(v, 2):g}'
    verbs = {'moveTo': 'M', 'lineTo': 'L', 'curveTo': 'C', 'qCurveTo': 'Q', 'closePath': 'Z'}
    out = []
    for verb, pts in path.segments:
        coords = ' '.join(f'{fmt((x - dx) * scale)} {fmt((y - dy) * scale)}' for x, y in pts)
        out.append(verbs[verb] + coords)
    return ''.join(out)


def complete_lozenge(items):
    """Shape 2's outline with the bottom corner restored.

    The bottom corner mirrors the top one about the horizontal line through
    the two side corners.
    """
    left, top, right = points(items[LEFT_CORNER]), points(items[TOP_CORNER]), points(items[RIGHT_CORNER])
    cy = (left[3].y + left[0].y) / 2
    mirror = lambda p: (p.x, 2 * cy - p.y)

    path = pathops.Path()
    path.moveTo(*points(items[LEFT_EDGE])[0])
    path.lineTo(top[0].x, top[0].y)
    path.cubicTo(top[1].x, top[1].y, top[2].x, top[2].y, top[3].x, top[3].y)
    path.lineTo(*points(items[RIGHT_EDGE])[1])
    path.cubicTo(right[1].x, right[1].y, right[2].x, right[2].y, right[3].x, right[3].y)
    path.lineTo(*mirror(top[3]))
    path.cubicTo(*mirror(top[2]), *mirror(top[1]), *mirror(top[0]))
    path.lineTo(left[0].x, left[0].y)
    path.cubicTo(left[1].x, left[1].y, left[2].x, left[2].y, left[3].x, left[3].y)
    path.close()
    return path


def climber(items):
    figure = items[FIGURE]
    foot_right, foot_left = points(figure[0])[0], points(figure[-1])[-1]
    path = pathops.Path()
    pts = points(figure[0])
    path.moveTo(pts[0].x, pts[0].y)
    for item in figure:
        p = points(item)
        path.cubicTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y)
    path.lineTo(foot_left.x, LEG_END_Y)
    path.lineTo(foot_right.x, LEG_END_Y)
    path.close()
    return path


def main():
    drawings = fitz.open(PDF)[0].get_drawings()
    items = drawings[2]['items']

    lozenge = complete_lozenge(items)
    mark = pathops.op(lozenge, climber(items), pathops.PathOp.DIFFERENCE)

    # The mark is centred on a 100-unit square grid.
    x0, y0, x1, y1 = lozenge.bounds
    side = max(x1 - x0, y1 - y0)
    mark_svg = svg(mark, x0 - (side - (x1 - x0)) / 2, y0 - (side - (y1 - y0)) / 2, 100 / side)

    # The full logo keeps the PDF's units, offset to the panel's corner.
    panel = shape(drawings[1])
    px0, py0, px1, py1 = panel.bounds
    full = {
        name: svg(shape(drawings[i]), px0, py0, 1)
        for name, i in (('panel', 1), ('sign', 2), ('plate', 3), ('wordmark', 4))
    }

    print(
        json.dumps(
            {
                'MARK_PATH': mark_svg,
                'FULL_LOGO_VIEW_BOX': f'0 0 {round(px1 - px0, 2):g} {round(py1 - py0, 2):g}',
                'FULL_LOGO': full,
            },
            indent=2,
        )
    )


if __name__ == '__main__':
    main()
