import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from server import (
    PubChemError,
    _record_ops_counter,
    _record_ops_event,
    app,
    get_ghs_classification,
    ghs_cache,
    ops_counters,
    ops_recent_events,
    pubchem_get_json,
)


@pytest.fixture(autouse=True)
def reset_observability_state():
    ops_counters.clear()
    ops_recent_events.clear()
    ghs_cache.clear()
    yield
    ops_counters.clear()
    ops_recent_events.clear()
    ghs_cache.clear()


async def test_ops_report_endpoint_returns_current_counters():
    _record_ops_counter("cache.ghs.hit")
    _record_ops_event("cache_stale_hit", cid=123, age_hours=18.5)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
      response = await ac.get("/api/ops/report")

    assert response.status_code == 200
    data = response.json()
    assert data["counters"]["cache.ghs.hit"] == 1
    assert data["recentEvents"][0]["type"] == "cache_stale_hit"
    assert "generatedAt" in data


async def test_get_ghs_classification_counts_stale_cache_hits():
    ghs_cache[702] = ({"Record": {"cached": True}}, "2026-04-17T00:00:00+00:00")

    data, cache_hit, retrieved_at = await get_ghs_classification(702, http_client=None)

    assert data == {"Record": {"cached": True}}
    assert cache_hit is True
    assert retrieved_at == "2026-04-17T00:00:00+00:00"
    assert ops_counters["cache.ghs.hit"] == 1
    assert ops_counters["cache.ghs.stale_hit"] == 1
    assert ops_recent_events[-1]["type"] == "cache_stale_hit"


class _TimeoutClient:
    async def get(self, *_args, **_kwargs):
        raise httpx.ReadTimeout("timeout")


async def test_pubchem_timeout_is_recorded_in_observability_counters():
    with pytest.raises(PubChemError):
        await pubchem_get_json(
            _TimeoutClient(),
            "https://example.invalid/pubchem",
            timeout=0.01,
            retries=0,
        )

    assert ops_counters["upstream.timeout"] == 1
    assert ops_counters["upstream.retry_exhausted"] == 1
    assert ops_recent_events[-1]["type"] == "upstream_error"
