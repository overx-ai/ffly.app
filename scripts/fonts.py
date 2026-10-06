"""Self-hosts the Google Fonts woff2 subsets the site adds by script, and cuts Bricolage Grotesque
(opsz 12-96, wght 200-800) to the weights the site uses.

uv run --with fonttools --with brotli python scripts/fonts.py

Fonts are cached immutably by name, so a font already in public/fonts is never downloaded again, and a cut
font gets a new name and the full one is deleted.
"""
import re
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONTS = Path(__file__).resolve().parent.parent / 'public' / 'fonts'
WEIGHTS = (700, 800)
SUBSETS = ('latin', 'latin-ext')
CSS2 = 'https://fonts.googleapis.com/css2?family={family}&display=swap'
# Google Fonts serves woff2 only to a browser it knows.
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
CYRILLIC = ('cyrillic', 'cyrillic-ext')
# (css2 family, file name for a weight and subset, subsets). Onest stands in for the Latin display and body fonts,
# which have no Cyrillic; it stays variable at 400-800.
DOWNLOADS = (
    ('Onest:wght@400..800', 'onest-{subset}.woff2', CYRILLIC),
    ('IBM+Plex+Mono:wght@400;500;600', 'ibm-plex-mono-{weight}-{subset}.woff2', CYRILLIC),
)
FACE = re.compile(r'/\* ([\w-]+) \*/\s*@font-face \{[^}]*?font-weight: ([\d ]+);[^}]*?src: url\((\S+?)\)', re.S)


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})) as res:
        return res.read()


def download(family: str, name: str, subsets: tuple[str, ...]) -> None:
    css = get(CSS2.format(family=family)).decode()
    for subset, weight, url in FACE.findall(css):
        if subset not in subsets:
            continue
        target = FONTS / name.format(subset=subset, weight=weight.replace(' ', '-'))
        if target.exists():
            print(f'{target.name}: present')
            continue
        target.write_bytes(get(url))
        print(f'{target.name} {target.stat().st_size} B')


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
    for download_args in DOWNLOADS:
        download(*download_args)
    for subset in SUBSETS:
        cut(subset)
