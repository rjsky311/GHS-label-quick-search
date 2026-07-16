from datetime import datetime, timezone
from typing import Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from api_models import (
    DictionaryAliasPayload,
    DictionaryCorrectionRequestPayload,
    DictionaryCorrectionRequestStatusPayload,
    DictionaryManualEntryPayload,
    DictionaryMissQueryPayload,
    DictionaryMissQueryResolutionPayload,
    DictionaryMissQueryRetentionPayload,
    DictionaryReferenceLinkPayload,
    ReviewQueueRetentionPayload,
    WorkspaceDocumentPayload,
)
from pilot_store import ReviewQueueLimitError

ADMIN_DASHBOARD_LIST_DEFAULT_LIMIT = 250
ADMIN_DASHBOARD_LIST_MAX_LIMIT = 500


def _set_private_no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"


def _bounded_admin_list_limit(
    limit: Optional[int],
    *,
    default: int = ADMIN_DASHBOARD_LIST_DEFAULT_LIMIT,
    maximum: int = ADMIN_DASHBOARD_LIST_MAX_LIMIT,
) -> int:
    if limit is None:
        return default
    try:
        normalized = int(limit)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="limit must be an integer") from exc
    if normalized < 1:
        raise HTTPException(status_code=422, detail="limit must be at least 1")
    return min(normalized, maximum)


def _review_queue_capacity_error(exc: ReviewQueueLimitError) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=exc.as_detail(),
        headers={"Retry-After": "3600"},
    )


def create_pilot_admin_router(
    *,
    limiter,
    require_admin: Callable[[Request], None],
    ensure_workspace_doc_type: Callable[[str], str],
    pilot_store,
    app_version: str,
    ops_stale_threshold_hours: float,
    ops_counters,
    cid_cache,
    ghs_cache,
    ops_recent_events,
    is_dictionary_miss_capture_enabled: Callable[[], bool],
    record_ops_counter: Callable[..., None],
) -> APIRouter:
    router = APIRouter(dependencies=[Depends(_set_private_no_store)])

    @router.get("/ops/report")
    async def ops_report(request: Request):
        require_admin(request)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "version": app_version,
            "staleThresholdHours": ops_stale_threshold_hours,
            "counters": dict(sorted(ops_counters.items())),
            "cache": {
                "cidEntries": len(cid_cache),
                "ghsEntries": len(ghs_cache),
                "ghs": {
                    "entries": len(ghs_cache),
                    "currentBytes": ghs_cache.currsize,
                    "maxBytes": ghs_cache.maxsize,
                },
            },
            "recentEvents": list(ops_recent_events),
            "dictionary": pilot_store.get_dictionary_summary(limit=10),
        }

    @router.get("/dictionary/report")
    async def dictionary_report(request: Request):
        require_admin(request)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "version": app_version,
            "dictionary": pilot_store.get_dictionary_summary(limit=50),
        }

    @router.get("/dictionary/manual-entries")
    async def dictionary_manual_entries(
        request: Request,
        status: Optional[str] = None,
        limit: Optional[int] = None,
    ):
        require_admin(request)
        bounded_limit = _bounded_admin_list_limit(limit)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "limit": bounded_limit,
            "items": pilot_store.list_manual_entries(
                status=status,
                limit=bounded_limit,
            ),
        }

    @router.post("/dictionary/manual-entries")
    async def upsert_dictionary_manual_entry(
        request: Request,
        payload: DictionaryManualEntryPayload,
    ):
        require_admin(request)
        record = pilot_store.upsert_dictionary_entry(
            payload.cas_number,
            name_en=payload.name_en,
            name_zh=payload.name_zh,
            notes=payload.notes,
            source=payload.source,
            status=payload.status,
        )
        return {"ok": True, "record": record}

    @router.get("/dictionary/aliases")
    async def dictionary_aliases(
        request: Request,
        status: Optional[str] = None,
        locale: Optional[str] = None,
        cas_number: Optional[str] = None,
        limit: Optional[int] = None,
    ):
        require_admin(request)
        bounded_limit = _bounded_admin_list_limit(limit)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "limit": bounded_limit,
            "items": pilot_store.list_aliases(
                status=status,
                locale=locale,
                cas_number=cas_number,
                limit=bounded_limit,
            ),
        }

    @router.post("/dictionary/aliases")
    async def upsert_dictionary_alias(request: Request, payload: DictionaryAliasPayload):
        require_admin(request)
        try:
            record = pilot_store.upsert_alias(
                payload.alias_text,
                payload.locale,
                payload.cas_number,
                source=payload.source,
                confidence=payload.confidence,
                status=payload.status,
                notes=payload.notes,
            )
        except ReviewQueueLimitError as exc:
            record_ops_counter("dictionary.alias.rejected")
            raise _review_queue_capacity_error(exc) from exc
        return {"ok": True, "record": record}

    @router.get("/dictionary/reference-links")
    async def dictionary_reference_links(
        request: Request,
        cas_number: Optional[str] = None,
        include_inactive: bool = False,
        limit: Optional[int] = None,
    ):
        require_admin(request)
        bounded_limit = _bounded_admin_list_limit(limit)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "limit": bounded_limit,
            "items": pilot_store.list_reference_links(
                cas_number,
                include_inactive=include_inactive,
                limit=bounded_limit,
            ),
        }

    @router.post("/dictionary/reference-links")
    async def upsert_dictionary_reference_link(
        request: Request,
        payload: DictionaryReferenceLinkPayload,
    ):
        require_admin(request)
        record = pilot_store.upsert_reference_link(
            payload.cas_number,
            label=payload.label,
            url=payload.url,
            link_type=payload.link_type,
            source=payload.source,
            priority=payload.priority,
            status=payload.status,
            cid=payload.cid,
        )
        return {"ok": True, "record": record}

    @router.post("/dictionary/correction-requests")
    @limiter.limit("20/minute")
    async def create_dictionary_correction_request(
        request: Request,
        payload: DictionaryCorrectionRequestPayload,
    ):
        try:
            record = pilot_store.record_correction_request(
                issue_type=payload.issue_type,
                cas_number=payload.cas_number,
                chemical_name=payload.chemical_name,
                query_text=payload.query_text,
                current_output=payload.current_output,
                expected_output=payload.expected_output,
                evidence_url=payload.evidence_url,
                evidence_type=payload.evidence_type,
                local_context=payload.local_context,
                candidate=payload.candidate,
                source="public",
            )
        except ReviewQueueLimitError as exc:
            record_ops_counter("dictionary.correction_request.rejected")
            raise _review_queue_capacity_error(exc) from exc
        record_ops_counter("dictionary.correction_request.created")
        return {"ok": True, "record": record}

    @router.get("/dictionary/correction-requests")
    async def dictionary_correction_requests(
        request: Request,
        status: Optional[str] = None,
    ):
        require_admin(request)
        statuses = None
        if status:
            statuses = [part.strip() for part in status.split(",") if part.strip()]
        try:
            items = pilot_store.list_correction_requests(
                statuses=statuses,
                include_context=True,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "items": items,
        }

    @router.post("/dictionary/correction-requests/{request_id}/status")
    async def update_dictionary_correction_request_status(
        request: Request,
        request_id: int,
        payload: DictionaryCorrectionRequestStatusPayload,
    ):
        require_admin(request)
        try:
            record = pilot_store.update_correction_request_status(
                request_id,
                status=payload.status,
                review_notes=payload.review_notes,
                candidate=payload.candidate,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        if record is None:
            raise HTTPException(status_code=404, detail="Correction request not found.")
        return {"ok": True, "record": record}

    @router.get("/dictionary/review-queues/retention")
    async def dictionary_review_queue_retention(request: Request):
        require_admin(request)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "retention": pilot_store.get_review_queue_retention_summary(),
        }

    @router.post("/dictionary/review-queues/retention/purge")
    async def purge_dictionary_review_queues(
        request: Request,
        payload: ReviewQueueRetentionPayload,
    ):
        require_admin(request)
        result = pilot_store.purge_stale_review_rows(
            retention_days=payload.retention_days,
        )
        record_ops_counter(
            "dictionary.review_queue.alias_rows_purged",
            result["deletedAliasCount"],
        )
        record_ops_counter(
            "dictionary.review_queue.correction_rows_purged",
            result["deletedCorrectionCount"],
        )
        return {"ok": True, "retention": result}

    @router.post("/dictionary/miss-query")
    @limiter.limit("30/minute")
    async def dictionary_miss_query(request: Request, payload: DictionaryMissQueryPayload):
        if not is_dictionary_miss_capture_enabled():
            return {
                "ok": False,
                "skipped": True,
                "reason": "dictionary miss capture is disabled",
            }

        return {
            "ok": True,
            "record": pilot_store.record_miss_query(
                payload.query,
                payload.query_kind,
                payload.endpoint,
                context=payload.context,
            ),
        }

    @router.get("/dictionary/miss-queries/retention")
    async def dictionary_miss_query_retention(request: Request):
        require_admin(request)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "retention": pilot_store.get_miss_query_retention_summary(),
        }

    @router.post("/dictionary/miss-queries/retention/purge")
    async def purge_dictionary_miss_queries(
        request: Request,
        payload: DictionaryMissQueryRetentionPayload,
    ):
        require_admin(request)
        return {
            "ok": True,
            "retention": pilot_store.purge_stale_miss_queries(
                retention_days=payload.retention_days,
            ),
        }

    @router.post("/dictionary/miss-queries/{miss_id}/resolution")
    async def update_dictionary_miss_query_resolution(
        request: Request,
        miss_id: int,
        payload: DictionaryMissQueryResolutionPayload,
    ):
        require_admin(request)
        try:
            record = pilot_store.update_miss_query_resolution(
                miss_id,
                resolution_status=payload.resolution_status,
                resolved_cas=payload.resolved_cas,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        if record is None:
            raise HTTPException(status_code=404, detail="Miss query not found.")
        return {"ok": True, "record": record}

    @router.get("/workspace/{doc_type}")
    async def get_workspace_document(request: Request, doc_type: str):
        require_admin(request)
        doc_type = ensure_workspace_doc_type(doc_type)
        document = pilot_store.get_document(doc_type)
        if document is None:
            return {
                "docType": doc_type,
                "payload": None,
                "updatedAt": None,
            }
        return {
            "docType": doc_type,
            "payload": document["payload"],
            "updatedAt": document["updatedAt"],
        }

    @router.put("/workspace/{doc_type}")
    async def put_workspace_document(
        request: Request,
        doc_type: str,
        payload: WorkspaceDocumentPayload,
    ):
        require_admin(request)
        doc_type = ensure_workspace_doc_type(doc_type)
        document = pilot_store.put_document(doc_type, payload.payload)
        return {
            "docType": doc_type,
            "payload": document["payload"],
            "updatedAt": document["updatedAt"],
        }

    return router
