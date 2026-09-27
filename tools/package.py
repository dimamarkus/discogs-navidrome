#!/usr/bin/env python3
"""Build a deterministic Chrome Web Store ZIP from extension/ only."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension"
version = json.loads((SOURCE / "manifest.json").read_text())["version"]
output = ROOT / "dist" / f"chrome-web-store-upload-{version}.zip"
output.parent.mkdir(exist_ok=True)
allowed = {".json", ".js", ".mjs", ".html", ".css", ".png"}
with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
    for path in sorted(SOURCE.rglob("*")):
        relative = path.relative_to(SOURCE)
        if not path.is_file() or any(part.startswith(".") for part in relative.parts):
            continue
        if path.suffix not in allowed:
            raise SystemExit(f"Unexpected extension file: {relative}")
        if path.is_symlink():
            raise SystemExit(f"Symlink not allowed: {relative}")
        info = ZipInfo(relative.as_posix(), (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert "manifest.json" in archive.namelist()
print(output.relative_to(ROOT))
print("SHA256 " + hashlib.sha256(output.read_bytes()).hexdigest())
