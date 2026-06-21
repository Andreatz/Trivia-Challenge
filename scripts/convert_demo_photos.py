from pathlib import Path
import shutil
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
RELATIVE = Path("indovina-il-personaggio/anime")
PUBLIC = ROOT / "public" / "assets" / RELATIVE
ARCHIVE = ROOT / "archive" / "assets-originals" / RELATIVE

ARCHIVE.mkdir(parents=True, exist_ok=True)
for index in range(1, 5):
    source = PUBLIC / f"aizen-{index}.png"
    target = PUBLIC / f"aizen-{index}.webp"
    archived = ARCHIVE / source.name
    if source.exists():
        shutil.copy2(source, archived)
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.save(target, "WEBP", quality=86, method=6)
        source.unlink()
    elif not target.exists():
        raise SystemExit(f"File sorgente e destinazione mancanti: {source}")

print("Convertite 4 fotografie demo PNG in WebP; originali archiviati fuori da public/.")
