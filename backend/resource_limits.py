import json
from typing import Awaitable, Callable, Optional


DEFAULT_PUBLIC_JSON_BODY_BYTES = 512 * 1024
WORKSPACE_JSON_BODY_BYTES = 1024 * 1024
PRINT_PDF_JSON_BODY_BYTES = 8 * 1024 * 1024
EXPORT_JSON_BODY_BYTES = 20 * 1024 * 1024

_MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH"})
_EXACT_ROUTE_LIMITS = {
    "/api/print/pdf": PRINT_PDF_JSON_BODY_BYTES,
    "/api/export/xlsx": EXPORT_JSON_BODY_BYTES,
    "/api/export/csv": EXPORT_JSON_BODY_BYTES,
}

_TOO_LARGE_BODY = json.dumps(
    {
        "detail": {
            "code": "request_body_too_large",
            "message": "Request body exceeds the allowed byte limit",
        }
    },
    separators=(",", ":"),
).encode("utf-8")


def get_public_json_body_limit(
    method: str,
    path: str,
    *,
    default_limit: int = DEFAULT_PUBLIC_JSON_BODY_BYTES,
) -> Optional[int]:
    """Return the raw admission limit for a JSON API mutation.

    All current POST/PUT/PATCH routes under ``/api`` accept JSON. Keeping a
    default here means newly added mutation routes are bounded even before a
    route-specific Pydantic model is introduced.
    """
    if str(method or "").upper() not in _MUTATING_METHODS:
        return None
    normalized_path = str(path or "")
    if not normalized_path.startswith("/api/"):
        return None
    if normalized_path in _EXACT_ROUTE_LIMITS:
        return _EXACT_ROUTE_LIMITS[normalized_path]
    if normalized_path.startswith("/api/workspace/"):
        return WORKSPACE_JSON_BODY_BYTES
    return default_limit


class PublicJsonBodyLimitMiddleware:
    """Bound raw API request bytes before FastAPI attempts JSON decoding."""

    def __init__(
        self,
        app: Callable,
        *,
        default_limit: int = DEFAULT_PUBLIC_JSON_BODY_BYTES,
    ):
        self.app = app
        self.default_limit = max(1, int(default_limit))

    async def __call__(self, scope, receive, send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        limit = get_public_json_body_limit(
            scope.get("method", ""),
            scope.get("path", ""),
            default_limit=self.default_limit,
        )
        if limit is None:
            await self.app(scope, receive, send)
            return

        content_length = self._content_length(scope.get("headers", []))
        if content_length is not None and content_length > limit:
            await self._send_too_large(send)
            return

        chunks = []
        total = 0
        while True:
            message = await receive()
            if message.get("type") != "http.request":
                non_request_replayed = False

                async def replay_non_request():
                    nonlocal non_request_replayed
                    if non_request_replayed:
                        return await receive()
                    non_request_replayed = True
                    return message

                await self.app(scope, replay_non_request, send)
                return

            chunk = message.get("body", b"")
            total += len(chunk)
            if total > limit:
                await self._send_too_large(send)
                return
            if chunk:
                chunks.append(chunk)
            if not message.get("more_body", False):
                break

        replayed = False

        async def replay_body():
            nonlocal replayed
            if replayed:
                return await receive()
            replayed = True
            return {
                "type": "http.request",
                "body": b"".join(chunks),
                "more_body": False,
            }

        await self.app(scope, replay_body, send)

    @staticmethod
    def _content_length(headers) -> Optional[int]:
        for raw_name, raw_value in headers:
            if raw_name.lower() != b"content-length":
                continue
            try:
                value = int(raw_value.decode("ascii"))
            except (UnicodeDecodeError, ValueError):
                return None
            return value if value >= 0 else None
        return None

    @staticmethod
    async def _send_too_large(send: Callable[[dict], Awaitable[None]]) -> None:
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(_TOO_LARGE_BODY)).encode("ascii")),
                    (b"cache-control", b"no-store"),
                ],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": _TOO_LARGE_BODY,
                "more_body": False,
            }
        )
