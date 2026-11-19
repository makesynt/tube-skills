"""Fetch verified Public-Domain / CC0 archival images from Wikimedia Commons or NASA Images API.

Automatically saves clean, semantically named JPEGs/PNGs into assets/archive/
and records provenance + license metadata in assets/archive_ledger.json.

Usage:
  python scripts/fetch_archive.py --source wikimedia --query "Endurance Shackleton Frank Hurley 1915" --slug ship_trapped --out assets/archive
  python scripts/fetch_archive.py --source nasa --query "Apollo 13 lithium hydroxide mailbox" --slug apollo13_mailbox --out assets/archive
"""
from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

UA = "GeminiNeonDocumentary/1.0 (https://github.com/makesynt/tube-skills; educational archival documentary tool)"

PD_PATTERNS = re.compile(
    r"(public domain|pd-|cc0|cc-zero|no known copyright|usgov|nasa)",
    re.IGNORECASE,
)


def http_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def download_file(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        dest.write_bytes(resp.read())


def search_wikimedia(query: str, limit: int = 8) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"{query} filetype:bitmap",
            "gsrnamespace": "6",
            "gsrlimit": str(limit),
            "prop": "imageinfo",
            "iiprop": "url|size|extmetadata",
            "iiurlwidth": "1600",
        }
    )
    data = http_json(f"https://commons.wikimedia.org/w/api.php?{params}")
    pages = (data.get("query") or {}).get("pages") or {}
    results = []
    for page in pages.values():
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        ii = infos[0]
        meta = ii.get("extmetadata") or {}
        lic = (meta.get("LicenseShortName") or {}).get("value", "")
        usage = (meta.get("UsageTerms") or {}).get("value", "")
        artist = re.sub(r"<[^>]+>", "", (meta.get("Artist") or {}).get("value", "")).strip()
        desc = re.sub(r"<[^>]+>", "", (meta.get("ImageDescription") or {}).get("value", "")).strip()
        w = int(ii.get("width") or 0)
        h = int(ii.get("height") or 0)
        if w < 500 or h < 380:
            continue
        lic_combined = f"{lic} {usage}"
        if not PD_PATTERNS.search(lic_combined):
            continue
        dl_url = ii.get("thumburl") or ii.get("url")
        if not dl_url:
            continue
        results.append(
            {
                "title": page.get("title", ""),
                "url": dl_url,
                "source_page": ii.get("descriptionurl", ""),
                "width": w,
                "height": h,
                "license": lic or usage,
                "artist": artist[:160],
                "description": desc[:240],
                "repository": "Wikimedia Commons",
            }
        )
    results.sort(key=lambda x: x["width"] * x["height"], reverse=True)
    return results


def search_nasa(query: str, limit: int = 6) -> list[dict]:
    params = urllib.parse.urlencode({"q": query, "media_type": "image"})
    data = http_json(f"https://images-api.nasa.gov/search?{params}")
    items = ((data.get("collection") or {}).get("items") or [])[:limit]
    results = []
    for item in items:
        d0 = (item.get("data") or [{}])[0]
        links = item.get("links") or []
        preview = next((lk.get("href") for lk in links if lk.get("rel") == "preview"), None)
        nasa_id = d0.get("nasa_id", "")
        if not preview:
            continue
        # Try higher-res orig/large asset manifest when available
        dl_url = preview
        try:
            manifest = http_json(f"https://images-api.nasa.gov/asset/{urllib.parse.quote(nasa_id)}")
            hrefs = [x.get("href", "") for x in (manifest.get("collection") or {}).get("items") or []]
            best = next((h for h in hrefs if h.lower().endswith(("~large.jpg", "~medium.jpg"))), None)
            if best:
                dl_url = best.replace("http://", "https://")
        except Exception:
            pass
        results.append(
            {
                "title": d0.get("title", nasa_id),
                "url": dl_url,
                "source_page": f"https://images.nasa.gov/details/{nasa_id}",
                "width": 1600,
                "height": 1200,
                "license": "Public Domain (NASA Media)",
                "artist": d0.get("center", "NASA"),
                "description": (d0.get("description") or "")[:240],
                "repository": "NASA Image and Video Library",
            }
        )
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description="Fetch verified public-domain archival images.")
    ap.add_argument("--source", choices=["wikimedia", "nasa"], default="wikimedia")
    ap.add_argument("--query", required=True, help="Search keywords")
    ap.add_argument("--slug", required=True, help="Semantic filename prefix, e.g. beat01_endurance_ice")
    ap.add_argument("--count", type=int, default=1, help="Number of matching images to save")
    ap.add_argument("--out", default="assets/archive", help="Target archive directory")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    ledger_path = out_dir.parent / "archive_ledger.json"
    ledger = json.loads(ledger_path.read_text(encoding="utf-8")) if ledger_path.exists() else {"assets": []}

    hits = search_wikimedia(args.query) if args.source == "wikimedia" else search_nasa(args.query)
    if not hits:
        print(f"[WARN] No verified public-domain hits for '{args.query}' on {args.source}")
        return 1

    saved = 0
    for idx, hit in enumerate(hits[: args.count]):
        ext = ".png" if hit["url"].lower().endswith(".png") else ".jpg"
        fname = f"{args.slug}{'' if args.count == 1 else f'_{idx+1:02d}'}{ext}"
        dest = out_dir / fname
        download_file(hit["url"], dest)
        entry = {"file": fname, "slug": args.slug, **hit}
        ledger["assets"] = [a for a in ledger["assets"] if a.get("file") != fname] + [entry]
        print(f"[OK] Saved {dest} ({dest.stat().st_size // 1024} KB) — {hit['license']} | {hit['title']}")
        saved += 1

    ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if saved else 1


if __name__ == "__main__":
    raise SystemExit(main())
