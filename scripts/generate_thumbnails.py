import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets"
OUTPUT = ROOT / "public" / "thumbnails"
MANIFEST = ROOT / "public" / "thumbnails-manifest.json"
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}


def target_for(source: Path) -> Path:
    return (OUTPUT / source.relative_to(SOURCE)).with_suffix(".webp")


def generate(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.thumbnail((320, 180), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=76, method=6)


def source_hash(source: Path) -> str:
    return hashlib.sha256(source.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    sources = sorted(path for path in SOURCE.rglob("*") if path.suffix.lower() in EXTENSIONS)
    entries = []
    stale = []
    expected_targets = {target_for(source) for source in sources}
    extras = [path for path in OUTPUT.rglob("*.webp") if path not in expected_targets] if OUTPUT.exists() else []
    for source in sources:
        target = target_for(source)
        if not target.exists() and args.check:
            stale.append(target)
        elif not args.check:
            generate(source, target)
        entries.append({
            "source": source.relative_to(ROOT).as_posix(),
            "thumbnail": target.relative_to(ROOT).as_posix(),
            "sourceSha256": source_hash(source),
        })
    manifest = json.dumps({"version": 1, "thumbnails": entries}, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if stale or extras or not MANIFEST.exists() or MANIFEST.read_text(encoding="utf-8") != manifest:
            raise SystemExit("Thumbnail non aggiornate. Esegui npm run thumbnails:generate.")
        print(f"Thumbnail valide: {len(entries)} file locali.")
        return
    for extra in extras:
        extra.unlink()
    MANIFEST.write_text(manifest, encoding="utf-8")
    print(f"Generate {len(entries)} thumbnail locali in {OUTPUT.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
