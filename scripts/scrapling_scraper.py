#!/usr/bin/env python3
"""
Scrapling worker & local HTTP bridge for NextStep.

Run with the dedicated Scrapling virtualenv:
  "C:\\Users\\lilia\\OneDrive - IPSA\\Documents\\3 - Perso\\0 - Projets\\00 - Tools\\Scrapling\\venv\\Scripts\\python.exe" scripts/scrapling_scraper.py --help
"""

from __future__ import annotations

import argparse
import hmac
import ipaddress
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from scrapling.fetchers import Fetcher, StealthyFetcher
from scrapling.parser import Selector

CLOSED_PATTERNS = (
    "offre expirée",
    "offre expiree",
    "poste pourvu",
    "cette offre n'est plus disponible",
    "no longer accepting applications",
    "job has expired",
    "position has been filled",
)

HTML_TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")


def clean_text(raw: Any, max_len: int = 12000) -> str:
    if raw is None:
        return ""
    text = HTML_TAG_RE.sub(" ", str(raw))
    text = WHITESPACE_RE.sub(" ", text).strip()
    return text[:max_len]


def is_safe_http_url(raw: Any) -> str:
    if not isinstance(raw, str):
        return ""
    candidate = raw.strip()
    if not candidate:
        return ""
    try:
        parsed = urllib.parse.urlsplit(candidate)
    except ValueError:
        return ""
    if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc:
        return ""
    return urllib.parse.urlunsplit(parsed)


def is_safe_public_url(raw: Any) -> str:
    safe = is_safe_http_url(raw)
    if not safe:
        return ""
    parsed = urllib.parse.urlsplit(safe)
    if parsed.username or parsed.password:
        return ""

    host = (parsed.hostname or "").strip().lower().strip("[]")
    if not host:
        return ""
    if (
        host == "localhost"
        or host.endswith(".localhost")
        or host.endswith(".local")
        or host.endswith(".internal")
    ):
        return ""

    try:
        ip_obj = ipaddress.ip_address(host)
    except ValueError:
        return safe

    if (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_multicast
        or ip_obj.is_reserved
        or ip_obj.is_unspecified
    ):
        return ""

    # Block CGNAT 100.64.0.0/10
    if isinstance(ip_obj, ipaddress.IPv4Address):
        if ip_obj in ipaddress.IPv4Network("100.64.0.0/10"):
            return ""

    return safe


def check_liveness(status: int, text: str) -> tuple[bool, str]:
    if status in (404, 410):
        return False, f"HTTP {status}"
    lowered = text.lower()
    for pattern in CLOSED_PATTERNS:
        if pattern in lowered:
            return False, f"closed_pattern:{pattern}"
    return True, ""


def _normalize_contract(raw_contract: Any) -> str:
    val = str(raw_contract or "").lower()
    if not val:
        return ""
    if "altern" in val or "apprent" in val:
        return "Alternance"
    if "intern" in val or "stage" in val:
        return "Stage"
    if "cdd" in val or "contract" in val or "fixed" in val:
        return "CDD"
    if "freelance" in val:
        return "Freelance"
    if "full" in val or "cdi" in val:
        return "CDI"
    return str(raw_contract).strip()


def _extract_json_ld(page: Selector, url: str) -> dict[str, Any] | None:
    for script in page.css('script[type="application/ld+json"]'):
        raw_json = getattr(script, "text", "") or ""
        if not raw_json.strip():
            continue
        try:
            parsed = json.loads(raw_json)
        except json.JSONDecodeError:
            continue

        candidates: list[Any] = []
        if isinstance(parsed, list):
            candidates.extend(parsed)
        elif isinstance(parsed, dict):
            graph = parsed.get("@graph")
            if isinstance(graph, list):
                candidates.extend(graph)
            else:
                candidates.append(parsed)

        for item in candidates:
            if not isinstance(item, dict):
                continue
            type_val = item.get("@type")
            is_job = type_val == "JobPosting" or (
                isinstance(type_val, list) and "JobPosting" in type_val
            )
            if not is_job:
                continue

            org = item.get("hiringOrganization")
            company = ""
            if isinstance(org, dict):
                company = clean_text(org.get("name", ""), max_len=200)

            loc = ""
            job_loc = item.get("jobLocation")
            if isinstance(job_loc, list) and job_loc:
                job_loc = job_loc[0]
            if isinstance(job_loc, dict):
                addr = job_loc.get("address")
                if isinstance(addr, dict):
                    parts = [
                        clean_text(addr.get("addressLocality", ""), 80),
                        clean_text(addr.get("addressRegion", ""), 80),
                        clean_text(addr.get("addressCountry", ""), 80),
                    ]
                    loc = ", ".join(p for p in parts if p)
                elif job_loc.get("name"):
                    loc = clean_text(job_loc.get("name"), 160)

            identifier = item.get("identifier")
            ref = ""
            if isinstance(identifier, dict):
                ref = clean_text(identifier.get("value", ""), 100)

            return {
                "titre": clean_text(item.get("title", ""), 300),
                "entreprise": company,
                "url": url,
                "localisation": loc,
                "type_contrat": _normalize_contract(item.get("employmentType")),
                "experience_requise": clean_text(item.get("experienceRequirements", ""), 80),
                "reference": ref,
                "source": "Scrapling (JSON-LD)",
                "description": clean_text(item.get("description", ""), 12000),
            }

    return None


def _extract_wttj_next_data(page: Selector, url: str) -> dict[str, Any] | None:
    if "welcometothejungle.com" not in url.lower():
        return None
    scripts = page.css("script#__NEXT_DATA__")
    if not scripts:
        return None
    raw_json = getattr(scripts[0], "text", "") or ""
    if not raw_json.strip():
        return None
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError:
        return None

    job = data.get("props", {}).get("pageProps", {}).get("job")
    if not isinstance(job, dict):
        return None

    org = job.get("organization")
    company = clean_text(org.get("name", "") if isinstance(org, dict) else "", 200)
    office = job.get("office")
    loc = ""
    if isinstance(office, dict):
        city = clean_text(office.get("city", ""), 80)
        country = clean_text(office.get("country", "France"), 80)
        loc = f"{city}, {country}" if city else ""

    return {
        "titre": clean_text(job.get("name", ""), 300),
        "entreprise": company,
        "url": url,
        "localisation": loc,
        "type_contrat": _normalize_contract(job.get("contract_type")),
        "experience_requise": clean_text(job.get("experience_level", ""), 80),
        "reference": clean_text(job.get("reference") or job.get("slug") or "", 120),
        "source": "Scrapling (WTTJ)",
        "description": clean_text(job.get("description", ""), 12000),
    }


def _extract_adaptive_css(page: Selector, url: str) -> dict[str, Any]:
    h1_text = clean_text(page.css("h1::text").get() or "", 300)
    title_text = clean_text(page.css("title::text").get() or "", 300)
    titre = h1_text or (title_text.split("|")[0].split(" - ")[0].strip() if title_text else "")

    og_site = clean_text(
        page.css('meta[property="og:site_name"]::attr(content)').get() or "", 200
    )

    body_nodes = page.css("main") or page.css("article") or page.css("body")
    desc = ""
    if body_nodes:
        desc = clean_text(body_nodes[0].get_all_text(), 12000)

    return {
        "titre": titre or "Offre sans titre",
        "entreprise": og_site,
        "url": url,
        "localisation": "",
        "type_contrat": "",
        "experience_requise": "",
        "reference": "",
        "source": "Scrapling (Selector)",
        "description": desc,
    }


def parse_job_page(
    html_or_selector: str | Selector,
    url: str,
    status: int = 200,
) -> dict[str, Any]:
    """Parse an HTML page or Scrapling Selector into a normalized offer dictionary."""
    if isinstance(html_or_selector, Selector):
        page = html_or_selector
    else:
        page = Selector(content=html_or_selector, url=url, adaptive=True)

    full_text = clean_text(page.get_all_text(), max_len=20000)
    is_live, closed_reason = check_liveness(status, full_text)

    offer = _extract_json_ld(page, url)
    if not offer or not offer.get("titre"):
        wttj_offer = _extract_wttj_next_data(page, url)
        if wttj_offer and wttj_offer.get("titre"):
            offer = wttj_offer
    if not offer or not offer.get("titre"):
        offer = _extract_adaptive_css(page, url)

    offer["is_live"] = is_live
    if closed_reason:
        offer["closed_reason"] = closed_reason
    return offer


def scrape_urls(
    urls: list[str],
    *,
    stealth: bool = False,
    delay: float = 1.0,
    include_closed: bool = False,
) -> list[dict[str, Any]]:
    offers: list[dict[str, Any]] = []

    for index, raw_url in enumerate(urls):
        safe_url = is_safe_public_url(raw_url)
        if not safe_url:
            print(f"[skip] Unsafe or invalid URL: {raw_url}", file=sys.stderr)
            continue

        if index > 0 and delay > 0:
            time.sleep(delay)

        try:
            if stealth:
                response = StealthyFetcher.fetch(safe_url, headless=True, timeout=30000)
            else:
                response = Fetcher.get(safe_url, timeout=15, follow_redirects=True)
        except Exception as exc:
            print(f"[warn] Fetch failed for {safe_url}: {exc}", file=sys.stderr)
            continue

        final_url = is_safe_public_url(getattr(response, "url", safe_url)) or safe_url
        status = int(getattr(response, "status", 200) or 200)
        offer = parse_job_page(response, final_url, status=status)

        if not include_closed and not offer.get("is_live", True):
            print(
                f"[skip] Closed/expired offer ({offer.get('closed_reason', 'inactive')}): {final_url}",
                file=sys.stderr,
            )
            continue

        offers.append(offer)

    return offers


def push_to_webhook(
    webhook_url: str,
    offers: list[dict[str, Any]],
    user_id: str,
    secret: str,
) -> dict[str, Any]:
    safe_webhook = is_safe_http_url(webhook_url)
    if not safe_webhook:
        raise ValueError("Invalid webhook URL (must be http:// or https://)")
    if not secret:
        raise ValueError("WEBHOOK_SECRET environment variable is required to push to webhook")

    parsed = urllib.parse.urlsplit(safe_webhook)
    query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    if "userId" not in query_params:
        query_params["userId"] = [user_id]
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    target_url = urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, new_query, "")
    )

    body_bytes = json.dumps(offers).encode("utf-8")
    req = urllib.request.Request(
        target_url,
        data=body_bytes,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Secret": secret,
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def make_bridge_handler(expected_token: str):
    class ScraplingBridgeHandler(BaseHTTPRequestHandler):
        def _send_json(self, status_code: int, payload: dict[str, Any]) -> None:
            encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self) -> None:
            if self.path == "/health":
                self._send_json(200, {"ok": True})
                return
            self._send_json(404, {"error": "Not found"})

        def do_POST(self) -> None:
            if self.path.split("?")[0] != "/scrape":
                self._send_json(404, {"error": "Not found"})
                return

            if expected_token:
                auth_header = self.headers.get("Authorization", "")
                provided = ""
                if auth_header.lower().startswith("bearer "):
                    provided = auth_header[7:].strip()
                if not provided or not hmac.compare_digest(provided, expected_token):
                    self._send_json(401, {"error": "Unauthorized"})
                    return

            try:
                content_length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self._send_json(400, {"error": "Invalid Content-Length"})
                return

            if content_length <= 0 or content_length > 65536:
                self._send_json(400, {"error": "Invalid request body size"})
                return

            try:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                payload = json.loads(raw_body)
            except (UnicodeDecodeError, json.JSONDecodeError):
                self._send_json(400, {"error": "Invalid JSON body"})
                return

            if not isinstance(payload, dict):
                self._send_json(400, {"error": "Expected JSON object"})
                return

            raw_urls = payload.get("urls") or []
            if not isinstance(raw_urls, list):
                self._send_json(400, {"error": "urls must be an array"})
                return

            try:
                max_results = max(1, min(int(payload.get("maxResults", 10)), 25))
            except (TypeError, ValueError):
                max_results = 10

            urls = [str(u) for u in raw_urls[:max_results] if isinstance(u, str)]
            stealth = bool(payload.get("stealth", False))
            include_closed = bool(payload.get("includeClosed", False))

            offers = scrape_urls(
                urls,
                stealth=stealth,
                delay=0.5,
                include_closed=include_closed,
            )
            self._send_json(200, {"success": True, "offers": offers, "count": len(offers)})

        def log_message(self, format: str, *args: Any) -> None:
            return

    return ScraplingBridgeHandler


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrapling job offer extractor for NextStep")
    parser.add_argument("--urls", nargs="*", default=[], help="Public job posting URLs to scrape")
    parser.add_argument("--stealth", action="store_true", help="Use StealthyFetcher (browser)")
    parser.add_argument(
        "--include-closed",
        action="store_true",
        help="Include offers detected as closed or expired",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay in seconds between requests (default: 1.0)",
    )
    parser.add_argument("--output", default="", help="Optional JSON output file path")
    parser.add_argument("--webhook", default="", help="Optional NextStep /api/webhook URL")
    parser.add_argument("--user-id", default="local-user", help="User ID for webhook push")
    parser.add_argument("--serve", action="store_true", help="Run local HTTP bridge server")
    parser.add_argument("--host", default="127.0.0.1", help="Bridge bind host")
    parser.add_argument("--port", type=int, default=8787, help="Bridge bind port")

    args = parser.parse_args()

    if args.serve:
        token = os.environ.get("SCRAPLING_API_TOKEN", "")
        server = ThreadingHTTPServer((args.host, args.port), make_bridge_handler(token))
        print(f"Scrapling bridge listening on http://{args.host}:{args.port}")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            server.server_close()
        return 0

    if not args.urls:
        parser.print_help()
        return 1

    offers = scrape_urls(
        args.urls,
        stealth=args.stealth,
        delay=max(0.0, args.delay),
        include_closed=args.include_closed,
    )

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            json.dump(offers, fh, ensure_ascii=False, indent=2)
        print(f"Saved {len(offers)} offer(s) to {args.output}")
    else:
        print(json.dumps(offers, ensure_ascii=False, indent=2))

    if args.webhook and offers:
        secret = os.environ.get("WEBHOOK_SECRET", "")
        result = push_to_webhook(args.webhook, offers, args.user_id, secret)
        print(f"Webhook response: {json.dumps(result, ensure_ascii=False)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
