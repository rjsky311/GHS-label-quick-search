import asyncio
import re

import pytest
from pydantic import ValidationError
from starlette.testclient import TestClient

from pdf_render import (
    MAX_PRINT_PDF_HTML_BYTES,
    PdfRenderBusyError,
    PdfRenderError,
    PdfRenderUnavailableError,
    PrintPdfPage,
    PrintPdfRenderer,
    PrintPdfRequest,
    block_non_data_route,
)


VALID_HTML = """<!DOCTYPE html>
<html>
  <head>
    <style>@page { size: 210mm 297mm; margin: 10mm; }</style>
  </head>
  <body><main>鹽酸 Hydrochloric acid</main></body>
</html>
"""


def make_pdf_bytes(page_sizes=((595.28, 841.89),)):
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        (
            b"<< /Type /Pages /Kids ["
            + b" ".join(
                f"{index + 3} 0 R".encode("ascii")
                for index in range(len(page_sizes))
            )
            + f"] /Count {len(page_sizes)} >>".encode("ascii")
        ),
    ]
    for width, height in page_sizes:
        objects.append(
            (
                "<< /Type /Page /Parent 2 0 R "
                f"/MediaBox [0 0 {width:g} {height:g}] >>"
            ).encode("ascii")
        )

    pdf = bytearray(b"%PDF-1.7\n")
    offsets = [0]
    for number, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode("ascii"))
        pdf.extend(body)
        pdf.extend(b"\nendobj\n")
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(pdf)


VALID_A4_PDF = make_pdf_bytes()


def make_request(**overrides):
    payload = {
        "html": VALID_HTML,
        "page": {
            "width_mm": 210,
            "height_mm": 297,
            "orientation": "portrait",
            "margin_mm": 10,
        },
        "meta": {
            "label_purpose": "complete",
            "page_count_expected": 1,
        },
    }
    payload.update(overrides)
    return PrintPdfRequest.model_validate(payload)


def validation_error_for(payload):
    with pytest.raises(ValidationError) as exc_info:
        PrintPdfRequest.model_validate(payload)
    return str(exc_info.value)


def test_pdf_request_rejects_html_over_three_mb():
    html = "x" * (MAX_PRINT_PDF_HTML_BYTES + 1)

    message = validation_error_for(
        {
            "html": html,
            "page": {
                "width_mm": 210,
                "height_mm": 297,
                "orientation": "portrait",
                "margin_mm": 10,
            },
            "meta": {"label_purpose": "complete", "page_count_expected": 1},
        }
    )

    assert "html is too large" in message


@pytest.mark.parametrize(
    "html, expected",
    [
        ("<SCRIPT>alert(1)</SCRIPT>", "script tags are not allowed"),
        ('<a href="javascript:alert(1)">bad</a>', "javascript URLs are not allowed"),
        ('<img src="data:x" onload="alert(1)">', "event handler attributes are not allowed"),
        ("<button ONCLICK = 'bad'>bad</button>", "event handler attributes are not allowed"),
    ],
)
def test_pdf_request_rejects_active_content(html, expected):
    message = validation_error_for(
        {
            "html": f"<!doctype html><html><body>{html}</body></html>",
            "page": {
                "width_mm": 210,
                "height_mm": 297,
                "orientation": "portrait",
                "margin_mm": 10,
            },
            "meta": {"label_purpose": "complete", "page_count_expected": 1},
        }
    )

    assert expected in message


@pytest.mark.parametrize(
    "field, value",
    [
        ("width_mm", 49),
        ("width_mm", 501),
        ("height_mm", 49),
        ("height_mm", 501),
    ],
)
def test_pdf_page_geometry_stays_between_50_and_500_mm(field, value):
    page = {
        "width_mm": 210,
        "height_mm": 297,
        "orientation": "portrait",
        "margin_mm": 10,
        field: value,
    }

    message = validation_error_for(
        {
            "html": VALID_HTML,
            "page": page,
            "meta": {"label_purpose": "complete", "page_count_expected": 1},
        }
    )

    assert field in message


def test_pdf_page_rejects_unsupported_orientation():
    with pytest.raises(ValidationError):
        PrintPdfPage.model_validate(
            {
                "width_mm": 210,
                "height_mm": 297,
                "orientation": "sideways",
                "margin_mm": 10,
            }
        )


class FakeRoute:
    def __init__(self, url):
        self.request = type("Request", (), {"url": url})()
        self.action = None

    async def continue_(self):
        self.action = "continue"

    async def abort(self):
        self.action = "abort"


@pytest.mark.asyncio
async def test_route_policy_allows_only_data_urls():
    data_route = FakeRoute("data:image/svg+xml;base64,abc")
    http_route = FakeRoute("https://example.test/GHS01.svg")

    await block_non_data_route(data_route)
    await block_non_data_route(http_route)

    assert data_route.action == "continue"
    assert http_route.action == "abort"


class FakePage:
    def __init__(self):
        self.content_calls = []
        self.pdf_calls = []

    async def set_content(self, html, **kwargs):
        self.content_calls.append((html, kwargs))

    async def pdf(self, **kwargs):
        self.pdf_calls.append(kwargs)
        return VALID_A4_PDF


class FakeContext:
    def __init__(self):
        self.page = FakePage()
        self.routes = []
        self.closed = False

    async def route(self, pattern, handler):
        self.routes.append((pattern, handler))

    async def new_page(self):
        return self.page

    async def close(self):
        self.closed = True


class FakeBrowser:
    def __init__(self):
        self.context_kwargs = []
        self.contexts = []

    async def new_context(self, **kwargs):
        self.context_kwargs.append(kwargs)
        context = FakeContext()
        self.contexts.append(context)
        return context


class MismatchedOutputPage(FakePage):
    def __init__(self, pdf_bytes):
        super().__init__()
        self.pdf_bytes = pdf_bytes

    async def pdf(self, **kwargs):
        self.pdf_calls.append(kwargs)
        return self.pdf_bytes


class MismatchedOutputContext(FakeContext):
    def __init__(self, pdf_bytes):
        super().__init__()
        self.page = MismatchedOutputPage(pdf_bytes)


class MismatchedOutputBrowser(FakeBrowser):
    def __init__(self, pdf_bytes):
        super().__init__()
        self.pdf_bytes = pdf_bytes

    async def new_context(self, **kwargs):
        self.context_kwargs.append(kwargs)
        context = MismatchedOutputContext(self.pdf_bytes)
        self.contexts.append(context)
        return context


@pytest.mark.asyncio
async def test_renderer_uses_js_disabled_context_network_blocking_and_css_page_size():
    browser = FakeBrowser()
    renderer = PrintPdfRenderer(browser=browser)
    request = make_request()

    pdf = await renderer.render(request)

    assert pdf == VALID_A4_PDF
    assert browser.context_kwargs == [{"java_script_enabled": False}]
    context = browser.contexts[0]
    assert context.routes[0][0] == "**/*"
    assert context.closed is True
    assert context.page.content_calls == [
        (VALID_HTML, {"wait_until": "load", "timeout": 10_000})
    ]
    assert context.page.pdf_calls == [
        {
            "print_background": True,
            "prefer_css_page_size": True,
            "width": "210mm",
            "height": "297mm",
            "margin": {
                "top": "10mm",
                "right": "10mm",
                "bottom": "10mm",
                "left": "10mm",
            },
        }
    ]


@pytest.mark.parametrize(
    "pdf_bytes",
    [
        make_pdf_bytes(((595.28, 841.89), (595.28, 841.89))),
        make_pdf_bytes(((1000, 1000),)),
    ],
)
@pytest.mark.asyncio
async def test_renderer_rejects_authoritative_pdf_output_mismatch(pdf_bytes):
    renderer = PrintPdfRenderer(browser=MismatchedOutputBrowser(pdf_bytes))

    with pytest.raises(PdfRenderError) as exc_info:
        await renderer.render(make_request())

    assert exc_info.value.code == "pdf_render_invalid_output"


@pytest.mark.asyncio
async def test_renderer_rejects_malformed_or_truncated_pdf_output():
    renderer = PrintPdfRenderer(
        browser=MismatchedOutputBrowser(b"%PDF-1.7\ntruncated")
    )

    with pytest.raises(PdfRenderError) as exc_info:
        await renderer.render(make_request())

    assert exc_info.value.code == "pdf_render_invalid_output"


@pytest.mark.asyncio
async def test_renderer_checks_media_box_on_every_expected_page():
    pdf_bytes = make_pdf_bytes(((595.28, 841.89), (1000, 1000)))
    renderer = PrintPdfRenderer(browser=MismatchedOutputBrowser(pdf_bytes))
    request = make_request(
        meta={"label_purpose": "complete", "page_count_expected": 2}
    )

    with pytest.raises(PdfRenderError) as exc_info:
        await renderer.render(request)

    assert exc_info.value.code == "pdf_render_invalid_output"


@pytest.mark.asyncio
async def test_renderer_rejects_output_above_configured_byte_ceiling():
    renderer = PrintPdfRenderer(
        browser=MismatchedOutputBrowser(VALID_A4_PDF),
        max_output_bytes=len(VALID_A4_PDF) - 1,
    )

    with pytest.raises(PdfRenderError) as exc_info:
        await renderer.render(make_request())

    assert exc_info.value.code == "pdf_render_invalid_output"


@pytest.mark.asyncio
async def test_renderer_rejects_third_concurrent_render_without_queueing():
    renderer = PrintPdfRenderer(browser=FakeBrowser(), max_concurrent=2)
    await renderer._semaphore.acquire()
    await renderer._semaphore.acquire()

    with pytest.raises(PdfRenderBusyError) as exc_info:
        await renderer.render(make_request())

    assert exc_info.value.code == "pdf_render_busy"
    assert renderer._semaphore.locked()


@pytest.mark.asyncio
async def test_renderer_reports_unavailable_when_browser_is_missing():
    renderer = PrintPdfRenderer(browser=None)

    with pytest.raises(PdfRenderUnavailableError) as exc_info:
        await renderer.render(make_request())

    assert exc_info.value.code == "pdf_renderer_unavailable"


class SlowPage(FakePage):
    async def set_content(self, html, **kwargs):
        await asyncio.sleep(0.05)


class SlowContext(FakeContext):
    def __init__(self):
        super().__init__()
        self.page = SlowPage()


class SlowBrowser(FakeBrowser):
    async def new_context(self, **kwargs):
        self.context_kwargs.append(kwargs)
        context = SlowContext()
        self.contexts.append(context)
        return context


@pytest.mark.asyncio
async def test_renderer_maps_timeout_to_stable_error_code_and_closes_context():
    browser = SlowBrowser()
    renderer = PrintPdfRenderer(browser=browser, timeout_ms=1)

    with pytest.raises(PdfRenderError) as exc_info:
        await renderer.render(make_request())

    assert exc_info.value.code == "pdf_render_timeout"
    assert browser.contexts[0].closed is True


def _pdf_page_count(pdf_bytes):
    return len(re.findall(rb"/Type\s*/Page\b", pdf_bytes))


def _pdf_media_box_points(pdf_bytes):
    match = re.search(
        rb"/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([0-9.]+)\s+([0-9.]+)\s*\]",
        pdf_bytes,
    )
    assert match, "PDF MediaBox not found"
    return float(match.group(1)), float(match.group(2))


class EndpointRenderer:
    def __init__(self, pdf=b"%PDF-ENDPOINT"):
        self.pdf = pdf
        self.requests = []

    async def render(self, request):
        self.requests.append(request)
        return self.pdf


def test_print_pdf_endpoint_returns_attachment_pdf(monkeypatch):
    import server

    renderer = EndpointRenderer()
    monkeypatch.setattr(server, "pdf_renderer", renderer)
    client = TestClient(server.app)

    response = client.post(
        "/api/print/pdf",
        json=make_request().model_dump(),
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith(
        'attachment; filename="ghs-labels-'
    )
    assert response.content == b"%PDF-ENDPOINT"
    assert renderer.requests[0].html == VALID_HTML


def test_print_pdf_endpoint_maps_renderer_unavailable_to_503(monkeypatch):
    import server

    class UnavailableRenderer:
        async def render(self, request):
            raise PdfRenderUnavailableError()

    monkeypatch.setattr(server, "pdf_renderer", UnavailableRenderer())
    client = TestClient(server.app)

    response = client.post("/api/print/pdf", json=make_request().model_dump())

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "code": "pdf_renderer_unavailable",
            "message": "PDF renderer is unavailable",
        }
    }


def test_print_pdf_endpoint_does_not_log_submitted_html(monkeypatch, caplog):
    import server

    renderer = EndpointRenderer()
    monkeypatch.setattr(server, "pdf_renderer", renderer)
    client = TestClient(server.app)

    response = client.post("/api/print/pdf", json=make_request().model_dump())

    assert response.status_code == 200
    assert VALID_HTML not in caplog.text


def test_health_stays_live_and_reports_degraded_when_pdf_is_unavailable(monkeypatch):
    import server

    class UnavailableRenderer:
        available = False
        startup_error = RuntimeError("sensitive /internal/chromium/path")

    monkeypatch.setattr(server, "pdf_renderer", UnavailableRenderer())
    client = TestClient(server.app)

    health_response = client.get("/api/health")
    body = health_response.json()

    assert health_response.status_code == 200
    assert body["status"] == "healthy"
    assert body["readiness"] == "degraded"
    assert body["capabilities"] == {"pdf": {"available": False}}
    assert "sensitive" not in health_response.text
    assert "/internal/chromium/path" not in health_response.text


def test_health_reports_ready_when_pdf_is_available(monkeypatch):
    import server

    class AvailableRenderer:
        available = True

    monkeypatch.setattr(server, "pdf_renderer", AvailableRenderer())
    client = TestClient(server.app)

    health_response = client.get("/api/health")
    body = health_response.json()

    assert health_response.status_code == 200
    assert body["status"] == "healthy"
    assert body["readiness"] == "ready"
    assert body["capabilities"] == {"pdf": {"available": True}}


def test_pdf_health_canary_renders_a_minimal_pdf(monkeypatch):
    import server

    renderer = EndpointRenderer(pdf=b"%PDF-1.4\n/Type /Page\n%%EOF")
    monkeypatch.setattr(server, "pdf_renderer", renderer)
    client = TestClient(server.app)

    response = client.get("/api/health/pdf-canary")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "bytes": len(renderer.pdf),
        "pdfHeader": True,
    }
    assert renderer.requests[0].page.width_mm == 210
    assert renderer.requests[0].page.height_mm == 297
    assert renderer.requests[0].meta.page_count_expected == 1


def test_pdf_health_canary_returns_503_when_renderer_is_unavailable(monkeypatch):
    import server

    monkeypatch.setattr(server, "pdf_renderer", None)
    client = TestClient(server.app)

    response = client.get("/api/health/pdf-canary")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "code": "pdf_renderer_unavailable",
            "message": "PDF renderer is unavailable",
        }
    }


def test_print_pdf_endpoint_has_ten_per_minute_route_limit():
    import server

    matching_limits = [
        str(limit.limit)
        for key, limits in server.limiter._route_limits.items()
        if key.endswith(".print_pdf")
        for limit in limits
    ]

    assert matching_limits == ["10 per 1 minute"]


@pytest.mark.pdfrender
@pytest.mark.asyncio
async def test_real_chromium_render_produces_single_a4_pdf():
    renderer = PrintPdfRenderer()
    try:
        await renderer.startup()
    except Exception as exc:  # pragma: no cover - depends on local Chromium
        pytest.skip(f"Playwright/Chromium unavailable: {exc}")
    if not renderer.available:
        pytest.skip("Playwright/Chromium unavailable")

    try:
        pdf = await renderer.render(make_request())
    finally:
        await renderer.shutdown()

    assert pdf.startswith(b"%PDF-")
    assert _pdf_page_count(pdf) == 1
    width_pt, height_pt = _pdf_media_box_points(pdf)
    assert width_pt == pytest.approx(595.28, abs=3)
    assert height_pt == pytest.approx(841.89, abs=3)
