"""Thread-safe BDD story API.

Usage in tests::

    from executable_stories import story

    def test_login():
        story.init("User logs in with valid credentials", tags=["auth", "smoke"])
        story.given("a registered user")
        story.when("they submit valid credentials")
        story.then("they see the dashboard")
"""

from __future__ import annotations

import json
import os
import threading
import time
from typing import Any, Callable, TypeVar

_T = TypeVar("_T")


class _StoryContext:
    """Per-test story context stored in thread-local storage."""

    __slots__ = (
        "scenario",
        "steps",
        "tags",
        "tickets",
        "covers",
        "meta",
        "suite_path",
        "docs",
        "seen_primary_keywords",
        "step_counter",
        "attachments",
        "_current_step",
        "active_timers",
        "timer_counter",
        "otel_spans",
    )

    def __init__(
        self,
        scenario: str,
        *,
        tags: list[str] | None = None,
        tickets: list[dict[str, Any]] | None = None,
        covers: list[str] | None = None,
        meta: dict[str, Any] | None = None,
    ) -> None:
        self.scenario = scenario
        self.steps: list[dict[str, Any]] = []
        self.tags = tags or []
        self.tickets: list[dict[str, Any]] = tickets or []
        self.covers = covers or []
        self.meta = meta or {}
        self.suite_path: list[str] = []
        self.docs: list[dict[str, Any]] = []
        self.seen_primary_keywords: set[str] = set()
        self.step_counter: int = 0
        self.attachments: list[dict[str, Any]] = []
        self._current_step: dict[str, Any] | None = None
        self.active_timers: dict[int, dict[str, Any]] = {}
        self.timer_counter: int = 0
        self.otel_spans: list[dict[str, Any]] | None = None


class Story:
    """Thread-safe BDD story builder.

    Each test thread gets its own context via ``threading.local()``.
    """

    def __init__(self) -> None:
        self._local = threading.local()

    # ── context management ─────────────────────────────────────────

    @property
    def _ctx(self) -> _StoryContext | None:
        return getattr(self._local, "ctx", None)

    @staticmethod
    def _normalize_tickets(ticket: Any) -> list[dict[str, Any]] | None:
        """Normalize ticket input to list of ``{"id": ...}`` dicts."""
        if ticket is None:
            return None
        if not isinstance(ticket, list):
            ticket = [ticket]
        return [{"id": t} if isinstance(t, str) else t for t in ticket]

    def init(
        self,
        scenario: str,
        *,
        tags: list[str] | None = None,
        ticket: str | list[str] | dict | list[dict | str] | None = None,
        covers: list[str] | None = None,
        meta: dict[str, Any] | None = None,
        trace_url_template: str | None = None,
    ) -> None:
        """Start a new story context for the current test."""
        tickets = self._normalize_tickets(ticket)
        self._local.ctx = _StoryContext(scenario, tags=tags, tickets=tickets, covers=covers, meta=meta)

        # OTel bridge: detect active span, flow data bidirectionally
        ctx = self._local.ctx
        try:
            from opentelemetry import trace as otel_trace  # type: ignore[import-not-found]

            span = otel_trace.get_current_span()
            span_ctx = span.get_span_context()
            if span_ctx and span_ctx.trace_id and span_ctx.trace_id != 0:
                trace_id = format(span_ctx.trace_id, "032x")
                span_id = format(span_ctx.span_id, "016x")

                # OTel -> Story: capture traceId in structured meta
                ctx.meta["otel"] = {"traceId": trace_id, "spanId": span_id}

                # OTel -> Story: inject human-readable doc entries
                ctx.docs.append({"kind": "kv", "label": "Trace ID", "value": trace_id, "phase": "runtime"})

                template = trace_url_template or os.environ.get("OTEL_TRACE_URL_TEMPLATE")
                if template:
                    url = template.replace("{traceId}", trace_id)
                    ctx.docs.append({"kind": "link", "label": "View Trace", "url": url, "phase": "runtime"})

                # Story -> OTel: enrich active span with story attributes
                span.set_attribute("story.scenario", scenario)
                if tags:
                    span.set_attribute("story.tags", tags)
                if ticket:
                    ticket_list = [ticket] if isinstance(ticket, str) else ticket
                    span.set_attribute("story.tickets", ticket_list)
        except ImportError:
            pass  # opentelemetry not installed
        except Exception:
            pass  # OTel not available or no active span

    def _get_meta(self) -> dict[str, Any] | None:
        """Return the StoryMeta dict for the current test, or None."""
        ctx = self._ctx
        if ctx is None:
            return None

        result: dict[str, Any] = {"scenario": ctx.scenario}
        if ctx.steps:
            result["steps"] = list(ctx.steps)
        if ctx.tags:
            result["tags"] = list(ctx.tags)
        if ctx.tickets:
            result["tickets"] = list(ctx.tickets)
        if ctx.covers:
            result["covers"] = list(ctx.covers)
        if ctx.meta:
            result["meta"] = dict(ctx.meta)
        if ctx.suite_path:
            result["suitePath"] = list(ctx.suite_path)
        if ctx.docs:
            result["docs"] = list(ctx.docs)
        if ctx.otel_spans:
            result["otelSpans"] = ctx.otel_spans
        return result

    def _get_attachments(self) -> list[dict[str, Any]]:
        """Return the attachments list for the current test."""
        ctx = self._ctx
        if ctx is None:
            return []
        return list(ctx.attachments)

    def _require_context(self) -> _StoryContext:
        """Return the current context or raise."""
        ctx = self._ctx
        if ctx is None:
            raise RuntimeError("story method called before story.init()")
        return ctx

    def _clear(self) -> None:
        """Clear the current test's story context."""
        self._local.ctx = None

    # ── BDD steps ──────────────────────────────────────────────────

    def _add_step(
        self,
        keyword: str,
        text: str,
        *,
        mode: str | None = None,
        docs: list[dict[str, Any]] | None = None,
    ) -> None:
        ctx = self._ctx
        if ctx is None:
            raise RuntimeError(f"story.{keyword.lower()}() called before story.init()")
        # Auto-And: repeated primary keywords render as "And"
        if keyword in ("Given", "When", "Then"):
            if keyword in ctx.seen_primary_keywords:
                keyword = "And"
            else:
                ctx.seen_primary_keywords.add(keyword)
        step: dict[str, Any] = {"keyword": keyword, "text": text}
        step["id"] = f"step-{ctx.step_counter}"
        ctx.step_counter += 1
        if mode is not None:
            step["mode"] = mode
        if docs:
            step["docs"] = list(docs)
        ctx.steps.append(step)
        ctx._current_step = step

    def given(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        self._add_step("Given", text, mode=mode, docs=docs)

    def when(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        self._add_step("When", text, mode=mode, docs=docs)

    def then(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        self._add_step("Then", text, mode=mode, docs=docs)

    def and_(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        self._add_step("And", text, mode=mode, docs=docs)

    def but(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        self._add_step("But", text, mode=mode, docs=docs)

    # ── AAA pattern aliases ────────────────────────────────────────

    def arrange(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add an Arrange step (alias for Given)."""
        self._add_step("Given", text, mode=mode, docs=docs)

    def act(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add an Act step (alias for When)."""
        self._add_step("When", text, mode=mode, docs=docs)

    def assert_(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add an Assert step (alias for Then). Uses assert_ because assert is reserved."""
        self._add_step("Then", text, mode=mode, docs=docs)

    # ── Additional aliases ─────────────────────────────────────────

    def setup(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add a Setup step (alias for Given)."""
        self._add_step("Given", text, mode=mode, docs=docs)

    def context(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add a Context step (alias for Given)."""
        self._add_step("Given", text, mode=mode, docs=docs)

    def execute(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add an Execute step (alias for When)."""
        self._add_step("When", text, mode=mode, docs=docs)

    def action(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add an Action step (alias for When)."""
        self._add_step("When", text, mode=mode, docs=docs)

    def verify(self, text: str, *, docs: list[dict[str, Any]] | None = None, mode: str | None = None) -> None:
        """Add a Verify step (alias for Then)."""
        self._add_step("Then", text, mode=mode, docs=docs)

    # ── Wrapped step execution ────────────────────────────────────

    def fn(self, keyword: str, text: str, body: Callable[[], _T]) -> _T:
        """Wrap a callable as a BDD step with automatic timing.

        Creates a step marked as ``wrapped=True``, executes *body*,
        records ``durationMs``, and re-raises any exception.
        """
        self._add_step(keyword, text)
        ctx = self._require_context()
        step = ctx._current_step
        assert step is not None
        step["wrapped"] = True

        start = time.perf_counter()
        try:
            result = body()
            return result
        finally:
            step["durationMs"] = (time.perf_counter() - start) * 1000.0

    def expect(self, text: str, body: Callable[[], _T]) -> _T:
        """Shorthand for ``fn("Then", text, body)``."""
        return self.fn("Then", text, body)

    # ── Step timing ────────────────────────────────────────────────

    def start_timer(self) -> int:
        """Start a high-resolution timer tied to the current step.
        Returns a token to pass to end_timer().
        """
        ctx = self._require_context()
        token = ctx.timer_counter
        ctx.timer_counter += 1

        entry: dict[str, Any] = {
            "start": time.perf_counter(),
            "consumed": False,
        }
        if ctx._current_step is not None:
            entry["step_index"] = len(ctx.steps) - 1
            entry["step_id"] = ctx._current_step.get("id")

        ctx.active_timers[token] = entry
        return token

    def end_timer(self, token: int) -> None:
        """Stop the timer and record durationMs on the step that was active
        when start_timer() was called. Double-end is a no-op.
        """
        ctx = self._require_context()
        entry = ctx.active_timers.get(token)
        if entry is None or entry["consumed"]:
            return
        entry["consumed"] = True

        duration_ms = (time.perf_counter() - entry["start"]) * 1000.0

        step = None
        step_id = entry.get("step_id")
        if step_id is not None:
            for s in ctx.steps:
                if s.get("id") == step_id:
                    step = s
                    break
        if step is None:
            step_index = entry.get("step_index")
            if step_index is not None and step_index < len(ctx.steps):
                step = ctx.steps[step_index]

        if step is not None:
            step["durationMs"] = duration_ms

    # ── attachments ───────────────────────────────────────────────

    def attach(
        self,
        name: str,
        media_type: str,
        *,
        path: str | None = None,
        body: str | None = None,
        encoding: str | None = None,
        charset: str | None = None,
        file_name: str | None = None,
    ) -> "Story":
        """Attach a file or inline content to the current test."""
        ctx = self._require_context()
        a: dict[str, Any] = {"name": name, "mediaType": media_type}
        if path is not None:
            a["path"] = path
        if body is not None:
            a["body"] = body
        if encoding is not None:
            a["encoding"] = encoding
        if charset is not None:
            a["charset"] = charset
        if file_name is not None:
            a["fileName"] = file_name
        if ctx._current_step is not None:
            steps = ctx.steps
            idx = len(steps) - 1
            a["stepIndex"] = idx
            a["stepId"] = ctx._current_step.get("id")
        ctx.attachments.append(a)
        return self

    def attach_spans(self, spans: list[dict[str, Any]]) -> "Story":
        """Attach OTel spans for trace waterfall rendering in HTML reports."""
        ctx = self._require_context()
        ctx.otel_spans = spans
        return self

    # ── doc helpers ────────────────────────────────────────────────

    def _attach_doc(self, entry: dict[str, Any]) -> None:
        """Attach a doc entry to the current step or story-level docs."""
        ctx = self._ctx
        if ctx is None:
            raise RuntimeError("Doc method called before story.init()")
        if ctx.steps:
            # Attach to last step
            last = ctx.steps[-1]
            if "docs" not in last:
                last["docs"] = []
            last["docs"].append(entry)
        else:
            # Attach to story-level docs
            ctx.docs.append(entry)

    def _current_step_docs(self) -> list[dict[str, Any]]:
        """Return the docs list of the current (last) step."""
        ctx = self._require_context()
        last = ctx.steps[-1]
        if "docs" not in last:
            last["docs"] = []
        return last["docs"]

    def _story_docs(self) -> list[dict[str, Any]]:
        """Return the story-level docs list."""
        return self._require_context().docs

    def _dedup_children(self, children: list[dict[str, Any]]) -> None:
        """Remove children from all flat containers so they only appear nested."""
        child_ids = {id(c) for c in children}
        ctx = self._require_context()
        ctx.docs[:] = [d for d in ctx.docs if id(d) not in child_ids]
        for step in ctx.steps:
            docs = step.get("docs")
            if docs is not None:
                step["docs"] = [d for d in docs if id(d) not in child_ids]

    def _apply_children(self, entry: dict[str, Any], children: list[dict[str, Any]] | None) -> None:
        """If children are provided, attach them and deduplicate."""
        if children:
            entry["children"] = children
            self._dedup_children(children)

    def note(self, text: str, *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a free-text note."""
        entry: dict[str, Any] = {"kind": "note", "text": text, "phase": "runtime"}
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def tag(self, name_or_names: str | list[str], *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add tag(s) as a doc entry."""
        names = [name_or_names] if isinstance(name_or_names, str) else list(name_or_names)
        entry: dict[str, Any] = {"kind": "tag", "names": names, "phase": "runtime"}
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def kv(self, label: str, value: Any, *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a key-value pair."""
        entry: dict[str, Any] = {"kind": "kv", "label": label, "value": value, "phase": "runtime"}
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def json(self, label: str, value: Any, *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a JSON code block (serialized with indent=2)."""
        entry: dict[str, Any] = {
            "kind": "code",
            "label": label,
            "content": json.dumps(value, indent=2),
            "lang": "json",
            "phase": "runtime",
        }
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def code(self, label: str, content: str, *, lang: str | None = None, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a code block."""
        entry: dict[str, Any] = {
            "kind": "code",
            "label": label,
            "content": content,
            "phase": "runtime",
        }
        if lang is not None:
            entry["lang"] = lang
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def table(self, label: str, columns: list[str], rows: list[list[str]], *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a table."""
        entry: dict[str, Any] = {
            "kind": "table",
            "label": label,
            "columns": columns,
            "rows": rows,
            "phase": "runtime",
        }
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def link(self, label: str, url: str, *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a hyperlink."""
        entry: dict[str, Any] = {"kind": "link", "label": label, "url": url, "phase": "runtime"}
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def section(self, title: str, markdown: str, *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a titled markdown section."""
        entry: dict[str, Any] = {
            "kind": "section",
            "title": title,
            "markdown": markdown,
            "phase": "runtime",
        }
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def mermaid(self, code: str, *, title: str | None = None, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a Mermaid diagram."""
        entry: dict[str, Any] = {"kind": "mermaid", "code": code, "phase": "runtime"}
        if title is not None:
            entry["title"] = title
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def screenshot(self, path: str, *, alt: str | None = None, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a screenshot reference."""
        entry: dict[str, Any] = {"kind": "screenshot", "path": path, "phase": "runtime"}
        if alt is not None:
            entry["alt"] = alt
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def state(self, value: Any, *, label: str | None = None, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a state snapshot (storyboard frame). Value must be JSON-serializable."""
        entry: dict[str, Any] = {"kind": "state", "value": value, "phase": "runtime"}
        if label is not None:
            entry["label"] = label
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def html(
        self,
        *,
        path: str | None = None,
        url: str | None = None,
        content: str | None = None,
        title: str | None = None,
        height: int | str | None = None,
        children: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Embed HTML in an always-sandboxed iframe.

        Exactly one of ``path``, ``url``, or ``content`` must be provided.
        """
        sources = [s for s in (path, url, content) if s is not None]
        if len(sources) != 1:
            raise ValueError("story.html() requires exactly one of path, url, or content")
        entry: dict[str, Any] = {"kind": "html", "phase": "runtime"}
        if path is not None:
            entry["path"] = path
        if url is not None:
            entry["url"] = url
        if content is not None:
            entry["content"] = content
        if title is not None:
            entry["title"] = title
        if height is not None:
            entry["height"] = height
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry

    def custom(self, type: str, data: Any, *, children: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Add a custom doc entry."""
        entry: dict[str, Any] = {
            "kind": "custom",
            "type": type,
            "data": data,
            "phase": "runtime",
        }
        if children:
            entry["children"] = children
            self._dedup_children(children)
        self._attach_doc(entry)
        return entry


# Module-level singleton
story = Story()
