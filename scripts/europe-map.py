"""Natural Earth 50m land -> one simplified SVG path of Europe, plus projected city points."""
import json
import math
import sys

LON0, LON1, LAT0, LAT1 = -12.0, 32.0, 35.0, 60.0
WIDTH = 640
KX = math.cos(math.radians(48))
SCALE = WIDTH / ((LON1 - LON0) * KX)
HEIGHT = round((LAT1 - LAT0) * SCALE)
EPSILON = 1.1
MIN_AREA = 6.0

CITIES = {'Warsaw': (21.01, 52.23), 'Madrid': (-3.70, 40.42), 'Amsterdam': (4.90, 52.37), 'Rome': (12.50, 41.90)}


def project(lon, lat):
    return ((lon - LON0) * KX * SCALE, (LAT1 - lat) * SCALE)


def clip(ring):
    # Sutherland-Hodgman against the viewport rectangle, in projected space.
    edges = [
        (lambda p: p[0] >= 0, lambda a, b: _ix(a, b, 0, 0)),
        (lambda p: p[0] <= WIDTH, lambda a, b: _ix(a, b, 0, WIDTH)),
        (lambda p: p[1] >= 0, lambda a, b: _ix(a, b, 1, 0)),
        (lambda p: p[1] <= HEIGHT, lambda a, b: _ix(a, b, 1, HEIGHT)),
    ]
    out = ring
    for inside, cut in edges:
        if not out:
            break
        src, out = out, []
        prev = src[-1]
        for cur in src:
            if inside(cur):
                if not inside(prev):
                    out.append(cut(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(cut(prev, cur))
            prev = cur
    return out


def _ix(a, b, axis, value):
    t = (value - a[axis]) / (b[axis] - a[axis])
    return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))


def rdp(points, eps):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    idx, dmax = 0, 0.0
    for i in range(1, len(points) - 1):
        d = abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            idx, dmax = i, d
    if dmax <= eps:
        return [points[0], points[-1]]
    return rdp(points[: idx + 1], eps)[:-1] + rdp(points[idx:], eps)


def area(ring):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


def main(src):
    rings = []
    for feature in json.load(open(src))['features']:
        geom = feature['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            for ring in poly:
                pts = clip([project(lon, lat) for lon, lat in ring[:-1]])
                if len(pts) < 3:
                    continue
                pts = rdp(pts, EPSILON)
                if len(pts) >= 3 and area(pts) >= MIN_AREA:
                    rings.append(pts)
    d = ''.join('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in r) + 'Z' for r in rings)
    cities = {n: [round(c, 1) for c in project(*ll)] for n, ll in CITIES.items()}
    json.dump({'width': WIDTH, 'height': HEIGHT, 'land': d, 'cities': cities,
               'graticule': {'lon': [[lon, round(project(lon, LAT1)[0], 1)] for lon in range(-10, 31, 10)],
                             'lat': [[lat, round(project(LON0, lat)[1], 1)] for lat in range(40, 60, 5)]}},
              sys.stdout)


if __name__ == '__main__':
    sys.setrecursionlimit(20000)
    main(sys.argv[1])
