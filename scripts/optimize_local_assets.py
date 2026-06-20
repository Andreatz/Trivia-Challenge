"""Ottimizza in modo lossless i PNG locali senza cambiare percorsi o dimensioni.

Uso predefinito (solo anteprima):
    python scripts/optimize_local_assets.py

Applicazione esplicita:
    python scripts/optimize_local_assets.py --apply
"""

from __future__ import annotations

import argparse
from pathlib import Path
from tempfile import NamedTemporaryFile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets"
MINIMUM_BYTES = 500 * 1024


def optimize_png(source: Path, apply: bool) -> tuple[int, int]:
    original_size = source.stat().st_size
    with Image.open(source) as image:
        image.load()
        with NamedTemporaryFile(dir=source.parent, suffix=".png", delete=False) as temporary:
            temporary_path = Path(temporary.name)
        try:
            image.save(temporary_path, format="PNG", optimize=True, compress_level=9)
            with Image.open(temporary_path) as verification:
                verification.verify()
            optimized_size = temporary_path.stat().st_size
            if apply and optimized_size < original_size:
                temporary_path.replace(source)
            return original_size, optimized_size
        finally:
            temporary_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Sostituisce i PNG solo quando l'output lossless è più piccolo.")
    arguments = parser.parse_args()

    candidates = sorted(path for path in ASSET_ROOT.rglob("*.png") if path.stat().st_size >= MINIMUM_BYTES)
    total_before = 0
    total_after = 0
    improved = 0

    for source in candidates:
        before, after = optimize_png(source, arguments.apply)
        total_before += before
        total_after += min(before, after)
        if after < before:
            improved += 1
            saving = (before - after) / 1024 / 1024
            print(f"{saving:6.2f} MiB  {source.relative_to(ROOT).as_posix()}", flush=True)

    saved = (total_before - total_after) / 1024 / 1024
    mode = "applicata" if arguments.apply else "stimata"
    print(f"\nOttimizzazione {mode}: {improved}/{len(candidates)} file, risparmio {saved:.2f} MiB.", flush=True)
    if not arguments.apply and improved:
        print("Per applicare: npm run assets:optimize:apply")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
