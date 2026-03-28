"""
SSE endpoint for real-time document streaming.

GET /api/v1/docs/{doc_id}/live
  → text/event-stream
  → yields events while an MCP agent writes to this doc via stream_write

GET /api/v1/docs/{doc_id}/live/status
  → JSON: { "active": bool, "buffer": str }
  → Quick check for the browser on mount — if active, there is already content
    buffered so the page can catch up without missing the first chunks.
"""
import json
import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.stream_manager import stream_manager

router = APIRouter(prefix="/api/v1", tags=["stream"])


# ── Status endpoint (polled on mount) ─────────────────────────────────────────

@router.get("/docs/{doc_id}/live/status")
async def live_status(doc_id: str):
    """Return whether a stream is currently active for this document."""
    active = stream_manager.has_active_stream(doc_id)
    buffer = stream_manager.get_buffer(doc_id) if active else ""
    return {"active": active, "buffer": buffer}


# ── SSE stream endpoint ────────────────────────────────────────────────────────

@router.get("/docs/{doc_id}/live")
async def doc_live_stream(doc_id: str):
    """
    Server-Sent Events stream for a single document.

    Events:
      chunk   — new content appended by the AI agent
      commit  — agent finished writing; browser should refetch the saved doc
      ping    — keepalive (browser ignores)
    """
    async def generator():
        queue = stream_manager.subscribe(doc_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    payload = json.dumps(event)
                    yield f"event: {event['type']}\ndata: {payload}\n\n"
                    if event.get("type") == "commit":
                        break
                except asyncio.TimeoutError:
                    # Send a keepalive comment so nginx / proxies don't close the connection
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            stream_manager.unsubscribe(doc_id, queue)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",   # tells nginx not to buffer SSE
        },
    )
