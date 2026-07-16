import json

import pytest
from starlette.testclient import TestClient

from resource_limits import (
    DEFAULT_PUBLIC_JSON_BODY_BYTES,
    PublicJsonBodyLimitMiddleware,
    get_public_json_body_limit,
)


def _scope(*, method="POST", path="/api/search", headers=None):
    return {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "https",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": headers or [(b"content-type", b"application/json")],
        "client": ("127.0.0.1", 1234),
        "server": ("testserver", 443),
    }


async def _run_asgi(app, scope, request_messages):
    messages = list(request_messages)
    sent = []

    async def receive():
        if messages:
            return messages.pop(0)
        return {"type": "http.disconnect"}

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    return sent


def _response_json(messages):
    body = b"".join(
        message.get("body", b"")
        for message in messages
        if message["type"] == "http.response.body"
    )
    return json.loads(body)


@pytest.mark.asyncio
async def test_content_length_is_rejected_before_downstream_json_parsing():
    downstream_called = False

    async def downstream(scope, receive, send):
        nonlocal downstream_called
        downstream_called = True

    middleware = PublicJsonBodyLimitMiddleware(downstream, default_limit=16)
    messages = await _run_asgi(
        middleware,
        _scope(
            headers=[
                (b"content-type", b"application/json"),
                (b"content-length", b"17"),
            ]
        ),
        [{"type": "http.request", "body": b"", "more_body": False}],
    )

    assert downstream_called is False
    assert messages[0]["status"] == 413
    assert _response_json(messages) == {
        "detail": {
            "code": "request_body_too_large",
            "message": "Request body exceeds the allowed byte limit",
        }
    }


@pytest.mark.asyncio
async def test_chunked_body_without_content_length_is_bounded_before_downstream():
    downstream_called = False

    async def downstream(scope, receive, send):
        nonlocal downstream_called
        downstream_called = True

    middleware = PublicJsonBodyLimitMiddleware(downstream, default_limit=16)
    messages = await _run_asgi(
        middleware,
        _scope(),
        [
            {"type": "http.request", "body": b"1234567890", "more_body": True},
            {"type": "http.request", "body": b"abcdefghij", "more_body": False},
        ],
    )

    assert downstream_called is False
    assert messages[0]["status"] == 413
    assert _response_json(messages)["detail"]["code"] == "request_body_too_large"


@pytest.mark.asyncio
async def test_allowed_chunked_body_is_replayed_exactly_once_to_downstream():
    received = []

    async def downstream(scope, receive, send):
        while True:
            message = await receive()
            received.append(message)
            if message["type"] != "http.request" or not message.get("more_body"):
                break
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    middleware = PublicJsonBodyLimitMiddleware(downstream, default_limit=32)
    messages = await _run_asgi(
        middleware,
        _scope(),
        [
            {"type": "http.request", "body": b'{"cas_', "more_body": True},
            {"type": "http.request", "body": b'numbers":[]}', "more_body": False},
        ],
    )

    assert messages[0]["status"] == 204
    assert received == [
        {
            "type": "http.request",
            "body": b'{"cas_numbers":[]}',
            "more_body": False,
        }
    ]


def test_route_limits_cover_all_mutating_api_routes_with_tighter_defaults():
    assert get_public_json_body_limit("GET", "/api/search") is None
    assert (
        get_public_json_body_limit("POST", "/api/search")
        == DEFAULT_PUBLIC_JSON_BODY_BYTES
    )
    assert get_public_json_body_limit("POST", "/api/print/pdf") > 3 * 1024 * 1024
    assert (
        get_public_json_body_limit("POST", "/api/export/xlsx")
        > get_public_json_body_limit("POST", "/api/print/pdf")
    )
    assert (
        get_public_json_body_limit("PUT", "/api/workspace/pilot-notes")
        > DEFAULT_PUBLIC_JSON_BODY_BYTES
    )


def test_live_app_returns_stable_413_for_oversized_search_json():
    import server

    client = TestClient(server.app)
    response = client.post(
        "/api/search",
        content=b"x" * (DEFAULT_PUBLIC_JSON_BODY_BYTES + 1),
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == {
        "code": "request_body_too_large",
        "message": "Request body exceeds the allowed byte limit",
    }
