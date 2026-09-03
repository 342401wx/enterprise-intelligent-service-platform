"""Provider model discovery adapted from CC Switch's model-fetch behavior.

The platform keeps this as a small Python service instead of importing the
desktop application's Rust/Tauri runtime. The URL candidate and auth-format
rules intentionally mirror CC Switch's provider model discovery contract.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


ERROR_BODY_MAX_CHARS = 512
KNOWN_COMPAT_SUFFIXES = (
    "/api/claudecode",
    "/api/anthropic",
    "/apps/anthropic",
    "/api/coding",
    "/claudecode",
    "/anthropic",
    "/step_plan",
    "/coding",
    "/claude",
)


def ends_with_version_segment(url: str) -> bool:
    last = url.rsplit("/", 1)[-1]
    return last.startswith("v") and len(last) > 1 and last[1:].isdigit()


def strip_compat_suffix(url: str) -> str | None:
    for suffix in KNOWN_COMPAT_SUFFIXES:
        if url.endswith(suffix):
            return url[: -len(suffix)]
    return None


def build_models_url_candidates(
    base_url: str,
    *,
    is_full_url: bool = False,
    models_url_override: str | None = None,
) -> list[str]:
    if models_url_override and models_url_override.strip():
        return [models_url_override.strip().rstrip("/")]

    trimmed = base_url.strip().rstrip("/")
    parsed = urllib.parse.urlparse(trimmed)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("API URL 必须是完整的 http(s) 地址")

    candidates: list[str] = []
    if is_full_url:
        marker = "/v1/"
        if marker in trimmed:
            root = trimmed.split(marker, 1)[0]
            candidates.append(f"{root}/v1/models")
        else:
            raise ValueError("完整 URL 模式需要包含 /v1/ 路径，或直接填写模型列表地址")
        return candidates

    if ends_with_version_segment(trimmed):
        candidates.append(f"{trimmed}/models")
        if not trimmed.endswith("/v1"):
            candidates.append(f"{trimmed}/v1/models")
    else:
        candidates.append(f"{trimmed}/v1/models")

    stripped = strip_compat_suffix(trimmed)
    if stripped:
        root = stripped.rstrip("/")
        if root and "://" in root:
            candidates.extend((f"{root}/v1/models", f"{root}/models"))

    return list(dict.fromkeys(candidates))[:4]


def auth_headers(api_key: str, api_format: str) -> dict[str, str]:
    key = api_key.strip()
    if not key:
        raise ValueError("API Key 不能为空")
    if api_format == "anthropic-messages":
        return {"x-api-key": key}
    if api_format == "google-generative-ai":
        return {"x-goog-api-key": key}
    return {"Authorization": f"Bearer {key}"}


def extract_model_names(payload: Any) -> list[str]:
    items = payload.get("data") if isinstance(payload, dict) else payload
    if items is None and isinstance(payload, dict):
        items = payload.get("models")
    if not isinstance(items, list):
        return []

    names: list[str] = []
    for item in items:
        if isinstance(item, str):
            name = item
        elif isinstance(item, dict):
            name = item.get("id") or item.get("name") or item.get("model")
        else:
            name = None
        if isinstance(name, str) and name.strip() and name.strip() not in names:
            names.append(name.strip())
    return sorted(names)


def _truncate(value: str) -> str:
    value = value.strip()
    if len(value) <= ERROR_BODY_MAX_CHARS:
        return value
    return value[:ERROR_BODY_MAX_CHARS] + "..."


def fetch_models(
    base_url: str,
    api_key: str,
    *,
    api_format: str = "openai-responses",
    is_full_url: bool = False,
    models_url_override: str | None = None,
) -> tuple[list[str], str]:
    candidates = build_models_url_candidates(
        base_url,
        is_full_url=is_full_url,
        models_url_override=models_url_override,
    )
    headers = {"Accept": "application/json", **auth_headers(api_key, api_format)}
    errors: list[str] = []

    for endpoint in candidates:
        request = urllib.request.Request(endpoint, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read(2 * 1024 * 1024)
            names = extract_model_names(json.loads(raw.decode("utf-8")))
            if names:
                return names, endpoint
            errors.append(f"{endpoint}: 返回成功但没有 data/models 模型字段")
        except urllib.error.HTTPError as exc:
            body = ""
            try:
                body = _truncate(exc.read().decode("utf-8", errors="replace"))
            except Exception:
                pass
            detail = f" HTTP {exc.code}"
            if body and exc.code not in {401, 403}:
                detail += f": {body}"
            errors.append(f"{endpoint}:{detail}")
            if exc.code not in {404, 405}:
                break
        except urllib.error.URLError:
            errors.append(f"{endpoint}: 连接失败")
            break
        except TimeoutError:
            errors.append(f"{endpoint}: 请求超时")
            break
        except (json.JSONDecodeError, UnicodeDecodeError):
            errors.append(f"{endpoint}: 返回内容不是有效 JSON")
            break

    raise ValueError("无法获取模型列表。" + "；".join(errors))
