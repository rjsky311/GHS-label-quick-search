import json
import subprocess
import sys
from pathlib import Path

from scripts.check_inline_dockerfile_parity import check_parity, normalize_dockerfile


CANONICAL = "FROM python:3.11-slim\nRUN echo canonical\n"
SERVICE_ID = "6962687391818d5fd9705a67"


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = []

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        if self.error:
            raise self.error
        return self.response


def _response(dockerfile):
    return FakeResponse(
        200,
        {
            "data": {
                "service": {
                    "_id": SERVICE_ID,
                    "name": "ghs-backend",
                    "spec": {"source": {"dockerfile": dockerfile}},
                }
            }
        },
    )


def test_normalize_dockerfile_only_normalizes_line_endings():
    assert normalize_dockerfile("a\r\nb\r\n") == "a\nb\n"
    assert normalize_dockerfile("a\n\n") == "a\n\n"


def test_identical_and_line_ending_only_live_recipes_pass():
    for live in (CANONICAL, CANONICAL.replace("\n", "\r\n")):
        client = FakeClient(_response(live))
        report = check_parity(
            canonical_text=CANONICAL,
            service_id=SERVICE_ID,
            endpoint="https://zeabur.example/graphql",
            token="secret-token",
            http_client=client,
        )

        assert report["ok"] is True
        assert report["canonicalDigest"] == report["liveDigest"]
        assert client.calls[0][1]["json"]["query"].lstrip().startswith("query")


def test_changed_live_recipe_fails_with_both_digests():
    client = FakeClient(_response(CANONICAL + "RUN echo changed\n"))
    report = check_parity(
        canonical_text=CANONICAL,
        service_id=SERVICE_ID,
        endpoint="https://zeabur.example/graphql",
        token="secret-token",
        http_client=client,
    )

    assert report["ok"] is False
    assert report["statusCategory"] == "changed"
    assert report["canonicalDigest"] != report["liveDigest"]
    assert "updateDockerfile" not in client.calls[0][1]["json"]["query"]


def test_unavailable_live_spec_is_a_redacted_failure():
    client = FakeClient(FakeResponse(503, {"errors": [{"message": "private details"}]}))
    report = check_parity(
        canonical_text=CANONICAL,
        service_id=SERVICE_ID,
        endpoint="https://zeabur.example/graphql",
        token="secret-token",
        http_client=client,
    )

    assert report["ok"] is False
    assert report["statusCategory"] == "unavailable"
    assert "private details" not in json.dumps(report)
    assert "secret-token" not in json.dumps(report)


def test_offline_cli_compares_fixture_without_network(tmp_path):
    canonical = tmp_path / "Dockerfile.ghs-backend"
    live = tmp_path / "live.dockerfile"
    canonical.write_text(CANONICAL)
    live.write_text(CANONICAL.replace("\n", "\r\n"))

    result = subprocess.run(
        [
            sys.executable,
            "scripts/check_inline_dockerfile_parity.py",
            "--canonical",
            str(canonical),
            "--offline-canonical",
            str(live),
        ],
        cwd=Path(__file__).parent,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    assert json.loads(result.stdout)["ok"] is True
