from httpx import ASGITransport, AsyncClient

import server


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
