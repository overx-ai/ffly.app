"""Cuts the Bricolage Grotesque woff2 subsets (Google Fonts, opsz 12-96, wght 200-800) to the weights the site uses.

uv run --with fonttools --with brotli python scripts/fonts.py

Fonts are cached immutably by name, so a cut font gets a new name and the full one is deleted.
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONTS = Path(__file__).resolve().parent.parent / 'public' / 'fonts'
WEIGHTS = (700, 800)
SUBSETS = ('latin', 'latin-ext')


def cut(subset: str) -> None:
    source = FONTS / f'bricolage-grotesque-{subset}.woff2'
    target = FONTS / f'bricolage-grotesque-{WEIGHTS[0]}-{WEIGHTS[1]}-{subset}.woff2'
    if not source.exists():
        print(f'{source.name}: absent, {target.name} stays as it is')
        return
    font = instancer.instantiateVariableFont(TTFont(source), {'wght': WEIGHTS})
    font.flavor = 'woff2'
    font.save(target)
    print(f'{source.name} {source.stat().st_size} B -> {target.name} {target.stat().st_size} B')
    source.unlink()


if __name__ == '__main__':
    for subset in SUBSETS:
        cut(subset)
