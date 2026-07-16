import asyncio
from io import BytesIO
import logging
import re
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator
from pypdf import PdfReader

logger = logging.getLogger(__name__)


MAX_PRINT_PDF_HTML_BYTES = 3 * 1024 * 1024
DEFAULT_RENDER_TIMEOUT_MS = 10_000
DEFAULT_MAX_CONCURRENT_RENDERS = 2
DEFAULT_MAX_RENDERED_PDF_BYTES = 64 * 1024 * 1024
PDF_POINTS_PER_MM = 72 / 25.4
PDF_GEOMETRY_TOLERANCE_POINTS = 3

_SCRIPT_TAG_PATTERN = re.compile(r"<\s*script\b", re.IGNORECASE)
_JAVASCRIPT_URL_PATTERN = re.compile(r"javascript\s*:", re.IGNORECASE)
_EVENT_HANDLER_ATTR_PATTERN = re.compile(
    r"<[^>]+\s+on[a-z][a-z0-9_:-]*\s*=",
    re.IGNORECASE,
)


class PrintPdfPage(BaseModel):
    width_mm: float = Field(..., ge=50, le=500)
    height_mm: float = Field(..., ge=50, le=500)
    orientation: Literal["portrait", "landscape"] = "portrait"
    margin_mm: float = Field(10, ge=0, le=50)


class PrintPdfMeta(BaseModel):
    label_purpose: Literal["complete", "qr", "identification"]
    page_count_expected: int = Field(..., ge=1, le=200)


class PrintPdfRequest(BaseModel):
    html: str = Field(..., min_length=1)
    page: PrintPdfPage
    meta: PrintPdfMeta

    @field_validator("html")
    @classmethod
    def html_must_be_bounded_and_passive(cls, value: str) -> str:
        encoded_size = len(value.encode("utf-8"))
        if encoded_size > MAX_PRINT_PDF_HTML_BYTES:
            raise ValueError("html is too large")
        if _SCRIPT_TAG_PATTERN.search(value):
            raise ValueError("script tags are not allowed")
        if _JAVASCRIPT_URL_PATTERN.search(value):
            raise ValueError("javascript URLs are not allowed")
        if _EVENT_HANDLER_ATTR_PATTERN.search(value):
            raise ValueError("event handler attributes are not allowed")
        return value


class PdfRenderError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class PdfRenderUnavailableError(PdfRenderError):
    def __init__(self, message: str = "PDF renderer is unavailable"):
        super().__init__("pdf_renderer_unavailable", message)


class PdfRenderBusyError(PdfRenderError):
    def __init__(self, message: str = "PDF renderer is busy"):
        super().__init__("pdf_render_busy", message)


async def block_non_data_route(route: Any) -> None:
    url = getattr(getattr(route, "request", None), "url", "")
    if isinstance(url, str) and url.startswith("data:"):
        await route.continue_()
        return
    await route.abort()


def _format_mm(value: float) -> str:
    if float(value).is_integer():
        return f"{int(value)}mm"
    return f"{value:g}mm"


def _invalid_pdf(reason: str) -> PdfRenderError:
    logger.warning(
        "Rejected generated PDF output",
        extra={"validation_reason": reason},
    )
    return PdfRenderError(
        "pdf_render_invalid_output",
        "Generated PDF did not match the requested page contract",
    )


def validate_rendered_pdf(
    pdf_bytes: bytes,
    payload: PrintPdfRequest,
    *,
    max_output_bytes: int = DEFAULT_MAX_RENDERED_PDF_BYTES,
) -> None:
    """Validate browser output without logging or retaining document data."""
    if not isinstance(pdf_bytes, bytes) or not pdf_bytes.startswith(b"%PDF-"):
        raise _invalid_pdf("invalid_header")
    if len(pdf_bytes) > max_output_bytes:
        raise _invalid_pdf("byte_limit_exceeded")

    try:
        reader = PdfReader(BytesIO(pdf_bytes), strict=True)
        if reader.is_encrypted:
            raise _invalid_pdf("encrypted_output")
        pages = list(reader.pages)
    except PdfRenderError:
        raise
    except Exception as exc:
        raise _invalid_pdf("malformed_document") from exc

    if len(pages) != payload.meta.page_count_expected:
        raise _invalid_pdf("page_count_mismatch")

    expected_width = payload.page.width_mm * PDF_POINTS_PER_MM
    expected_height = payload.page.height_mm * PDF_POINTS_PER_MM
    for page in pages:
        try:
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
        except Exception as exc:
            raise _invalid_pdf("invalid_media_box") from exc
        if (
            abs(width - expected_width) > PDF_GEOMETRY_TOLERANCE_POINTS
            or abs(height - expected_height) > PDF_GEOMETRY_TOLERANCE_POINTS
        ):
            raise _invalid_pdf("page_geometry_mismatch")


class PrintPdfRenderer:
    def __init__(
        self,
        *,
        browser: Optional[Any] = None,
        timeout_ms: int = DEFAULT_RENDER_TIMEOUT_MS,
        max_concurrent: int = DEFAULT_MAX_CONCURRENT_RENDERS,
        max_output_bytes: int = DEFAULT_MAX_RENDERED_PDF_BYTES,
    ):
        self._browser = browser
        self._playwright = None
        self._startup_error: Optional[Exception] = None
        self.timeout_ms = timeout_ms
        self.max_output_bytes = max(1, int(max_output_bytes))
        self._semaphore = asyncio.Semaphore(max_concurrent)

    @property
    def available(self) -> bool:
        return self._browser is not None

    @property
    def startup_error(self) -> Optional[Exception]:
        return self._startup_error

    async def startup(self) -> None:
        if self._browser is not None:
            return
        try:
            from playwright.async_api import async_playwright

            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch()
            self._startup_error = None
        except Exception as exc:  # pragma: no cover - environment dependent
            self._startup_error = exc
            self._browser = None
            # Surface the launch failure in runtime logs: a silent failure
            # here degrades /api/print/pdf to opaque 503s in production.
            logger.error(
                "PDF renderer startup failed; /api/print/pdf will return 503: %r",
                exc,
            )
            if self._playwright is not None:
                try:
                    await self._playwright.stop()
                finally:
                    self._playwright = None

    async def shutdown(self) -> None:
        if self._browser is not None:
            await self._browser.close()
            self._browser = None
        if self._playwright is not None:
            await self._playwright.stop()
            self._playwright = None

    async def render(self, payload: PrintPdfRequest) -> bytes:
        if self._browser is None:
            raise PdfRenderUnavailableError()
        if self._semaphore.locked():
            raise PdfRenderBusyError()
        await self._semaphore.acquire()
        try:
            return await asyncio.wait_for(
                self._render_with_context(payload),
                timeout=self.timeout_ms / 1000,
            )
        except asyncio.TimeoutError as exc:
            raise PdfRenderError(
                "pdf_render_timeout",
                "PDF render exceeded the request timeout",
            ) from exc
        except PdfRenderError:
            raise
        except Exception as exc:
            raise PdfRenderError("pdf_render_failed", "PDF render failed") from exc
        finally:
            self._semaphore.release()

    async def _render_with_context(self, payload: PrintPdfRequest) -> bytes:
        context = await self._browser.new_context(java_script_enabled=False)
        try:
            await context.route("**/*", block_non_data_route)
            page = await context.new_page()
            await page.set_content(
                payload.html,
                wait_until="load",
                timeout=self.timeout_ms,
            )
            margin = _format_mm(payload.page.margin_mm)
            pdf_bytes = await page.pdf(
                print_background=True,
                prefer_css_page_size=True,
                width=_format_mm(payload.page.width_mm),
                height=_format_mm(payload.page.height_mm),
                margin={
                    "top": margin,
                    "right": margin,
                    "bottom": margin,
                    "left": margin,
                },
            )
            validate_rendered_pdf(
                pdf_bytes,
                payload,
                max_output_bytes=self.max_output_bytes,
            )
            return pdf_bytes
        finally:
            await context.close()
