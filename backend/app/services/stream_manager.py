"""
In-memory pub/sub for real-time document streaming.

When an AI agent writes chunks via the MCP stream_write tool,
this manager broadcasts each chunk to any SSE subscribers
(browser tabs watching that document), and accumulates a buffer
so the full content can be committed to the DB in one write.

Mode 1 (local): pure asyncio, single process — no Redis needed.
Mode 2 (hosted): swap this for a Redis-backed implementation.
"""
import asyncio
from typing import AsyncGenerator


class StreamManager:
    def __init__(self):
        # doc_id → list of subscriber queues
        self._subscribers: dict[str, list[asyncio.Queue]] = {}
        # doc_id → accumulated content buffer
        self._buffers: dict[str, str] = {}

    # ── Writing (called by MCP tools) ──────────────────────────────────────

    async def write_chunk(self, doc_id: str, chunk: str) -> None:
        """Append a chunk to the buffer and broadcast to SSE listeners."""
        self._buffers.setdefault(doc_id, "")
        self._buffers[doc_id] += chunk
        await self._broadcast(doc_id, {"type": "chunk", "chunk": chunk})

    async def commit(self, doc_id: str) -> str:
        """
        Signal that writing is complete. Returns the full buffered content.
        Broadcasts a commit event so the browser can stop the live indicator.
        """
        content = self._buffers.pop(doc_id, "")
        await self._broadcast(doc_id, {"type": "commit", "chunk": ""})
        return content

    def get_buffer(self, doc_id: str) -> str:
        """Peek at the current buffer without committing."""
        return self._buffers.get(doc_id, "")

    def has_active_stream(self, doc_id: str) -> bool:
        return doc_id in self._buffers

    # ── Reading (called by SSE endpoint) ───────────────────────────────────

    def subscribe(self, doc_id: str) -> asyncio.Queue:
        """Register a new SSE listener. Returns a queue to read events from."""
        if doc_id not in self._subscribers:
            self._subscribers[doc_id] = []
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers[doc_id].append(queue)
        return queue

    def unsubscribe(self, doc_id: str, queue: asyncio.Queue) -> None:
        """Remove a listener when the SSE connection closes."""
        listeners = self._subscribers.get(doc_id, [])
        try:
            listeners.remove(queue)
        except ValueError:
            pass
        if not listeners:
            self._subscribers.pop(doc_id, None)

    async def stream_events(self, doc_id: str) -> AsyncGenerator[dict, None]:
        """Async generator that yields events until the stream commits.
        Timeout/keepalive handling is left to the caller (SSE router)."""
        queue = self.subscribe(doc_id)
        try:
            while True:
                event = await queue.get()
                yield event
                if event.get("type") == "commit":
                    break
        finally:
            self.unsubscribe(doc_id, queue)

    # ── Internal ───────────────────────────────────────────────────────────

    async def _broadcast(self, doc_id: str, event: dict) -> None:
        for queue in list(self._subscribers.get(doc_id, [])):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass  # slow consumer — skip rather than block


# Global singleton — imported by both MCP tools and the SSE router
stream_manager = StreamManager()
