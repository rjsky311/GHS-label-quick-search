import asyncio

from httpx import ASGITransport, AsyncClient

import server
from api_validation import MAX_PUBLIC_SEARCH_QUERY_LENGTH


async def test_search_single_query_endpoint_supports_name_lookup(monkeypatch):
    async def fake_search_chemical(cas_number, _http_client):
        return server.ChemicalResult(
            cas_number=cas_number,
            found=True,
            name_en="Ethanol",
            name_zh="Ethanol ZH",
        )

    monkeypatch.setattr(server, "search_chemical", fake_search_chemical)
    monkeypatch.setattr(server, "resolve_name_to_cas", lambda query: "64-17-5" if query == "ethanol" else None)

    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-single", params={"q": "ethanol"})

    assert response.status_code == 200
    assert response.json()["cas_number"] == "64-17-5"
    assert response.json()["found"] is True


async def test_search_single_query_endpoint_requires_query():
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search-single", params={"q": "   "})

    assert response.status_code == 400


async def test_search_single_query_endpoint_rejects_overlong_query():
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/api/search-single",
            params={"q": "x" * (MAX_PUBLIC_SEARCH_QUERY_LENGTH + 1)},
        )

    assert response.status_code == 422


async def test_search_endpoint_returns_upstream_error_before_gateway_timeout(monkeypatch):
    async def slow_search_chemical(cas_number, _http_client):
        await asyncio.sleep(1)
        return server.ChemicalResult(cas_number=cas_number, found=True)

    monkeypatch.setattr(server, "SEARCH_CHEMICAL_TIMEOUT_SECONDS", 0.01)
    monkeypatch.setattr(server, "search_chemical", slow_search_chemical)

    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/search/75-21-8")

    assert response.status_code == 200
    body = response.json()
    assert body["cas_number"] == "75-21-8"
    assert body["found"] is False
    assert body["upstream_error"] is True
    assert "timed out" in body["error"]


async def test_batch_search_runs_items_inside_one_gateway_budget(monkeypatch):
    async def slow_search_chemical(cas_number, _http_client):
        await asyncio.sleep(1)
        return server.ChemicalResult(cas_number=cas_number, found=True)

    monkeypatch.setattr(server, "SEARCH_CHEMICAL_TIMEOUT_SECONDS", 0.05)
    monkeypatch.setattr(server, "search_chemical", slow_search_chemical)

    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/search",
            json={"cas_numbers": [f"75-21-{index}" for index in range(10)]},
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 10
    assert all(row["found"] is False for row in body)
    assert all(row["upstream_error"] is True for row in body)
