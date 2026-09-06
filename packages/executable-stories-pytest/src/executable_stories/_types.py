"""Type definitions matching the raw-run.schema.json schema.

These are plain TypedDicts used for documentation and type-checking.
At runtime everything is just dicts serialized to JSON.
"""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict

# ── DocEntry variants ──────────────────────────────────────────────


class NoteDoc(TypedDict):
    kind: str  # "note"
    text: str
    phase: str  # "static" | "runtime"
    children: NotRequired[list["DocEntry"]]


class TagDoc(TypedDict):
    kind: str  # "tag"
    names: list[str]
    phase: str
    children: NotRequired[list["DocEntry"]]


class KvDoc(TypedDict):
    kind: str  # "kv"
    label: str
    value: Any
    phase: str
    children: NotRequired[list["DocEntry"]]


class CodeDoc(TypedDict):
    kind: str  # "code"
    label: str
    content: str
    phase: str
    lang: NotRequired[str]
    children: NotRequired[list["DocEntry"]]


class TableDoc(TypedDict):
    kind: str  # "table"
    label: str
    columns: list[str]
    rows: list[list[str]]
    phase: str
    children: NotRequired[list["DocEntry"]]


class LinkDoc(TypedDict):
    kind: str  # "link"
    label: str
    url: str
    phase: str
    children: NotRequired[list["DocEntry"]]


class SectionDoc(TypedDict):
    kind: str  # "section"
    title: str
    markdown: str
    phase: str
    children: NotRequired[list["DocEntry"]]


class MermaidDoc(TypedDict):
    kind: str  # "mermaid"
    code: str
    phase: str
    title: NotRequired[str]
    children: NotRequired[list["DocEntry"]]


class ScreenshotDoc(TypedDict):
    kind: str  # "screenshot"
    path: str
    phase: str
    alt: NotRequired[str]
    children: NotRequired[list["DocEntry"]]


class VideoDoc(TypedDict):
    kind: str  # "video"
    path: str
    phase: str
    caption: NotRequired[str]
    poster: NotRequired[str]
    children: NotRequired[list["DocEntry"]]


class StateDoc(TypedDict):
    kind: str  # "state"
    value: Any
    phase: str
    label: NotRequired[str]
    children: NotRequired[list["DocEntry"]]


class HtmlDoc(TypedDict):
    kind: str  # "html"
    phase: str
    path: NotRequired[str]
    url: NotRequired[str]
    content: NotRequired[str]
    title: NotRequired[str]
    height: NotRequired[int | str]
    children: NotRequired[list["DocEntry"]]


class CustomDoc(TypedDict):
    kind: str  # "custom"
    type: str
    data: Any
    phase: str
    children: NotRequired[list["DocEntry"]]


# Union of all doc entry types
DocEntry = (
    NoteDoc
    | TagDoc
    | KvDoc
    | CodeDoc
    | TableDoc
    | LinkDoc
    | SectionDoc
    | MermaidDoc
    | ScreenshotDoc
    | VideoDoc
    | StateDoc
    | HtmlDoc
    | CustomDoc
)


# ── Ticket ────────────────────────────────────────────────────────


class TicketDoc(TypedDict):
    id: str
    url: NotRequired[str]


# ── Attachment ────────────────────────────────────────────────────


class Attachment(TypedDict, total=False):
    name: str
    mediaType: str
    path: str
    body: str
    encoding: str  # "BASE64" | "IDENTITY"
    charset: str
    fileName: str
    byteLength: int
    stepIndex: int
    stepId: str


# ── RawStepEvent ──────────────────────────────────────────────────


class RawStepEvent(TypedDict, total=False):
    index: int
    title: str
    status: str
    durationMs: float


# ── StoryStep ──────────────────────────────────────────────────────


class StoryStep(TypedDict):
    keyword: str  # "Given" | "When" | "Then" | "And" | "But"
    text: str
    id: NotRequired[str]
    mode: NotRequired[str]
    wrapped: NotRequired[bool]
    # Assertions attributable to this step. pytest has no assertion counter, so
    # this is set only when the author wraps a claim in expect/fn("Then", ...).
    # An absent key means unobserved, which is not the same as zero.
    assertions: NotRequired[int]
    durationMs: NotRequired[float]
    docs: NotRequired[list[DocEntry]]


# ── StoryMeta ──────────────────────────────────────────────────────


class StoryMeta(TypedDict):
    scenario: str
    steps: NotRequired[list[StoryStep]]
    tags: NotRequired[list[str]]
    tickets: NotRequired[list[TicketDoc]]
    covers: NotRequired[list[str]]
    meta: NotRequired[dict[str, Any]]
    suitePath: NotRequired[list[str]]
    docs: NotRequired[list[DocEntry]]
    sourceOrder: NotRequired[int]


# ── RawTestCase ────────────────────────────────────────────────────


class ErrorInfo(TypedDict, total=False):
    message: str
    stack: str


class RawTestCase(TypedDict):
    status: str  # "pass" | "fail" | "skip" | ...
    externalId: NotRequired[str]
    title: NotRequired[str]
    titlePath: NotRequired[list[str]]
    story: NotRequired[StoryMeta]
    sourceFile: NotRequired[str]
    sourceLine: NotRequired[int]
    durationMs: NotRequired[float]
    error: NotRequired[ErrorInfo]
    meta: NotRequired[dict[str, Any]]
    retry: NotRequired[int]
    retries: NotRequired[int]
    attachments: NotRequired[list[Attachment]]
    stepEvents: NotRequired[list[RawStepEvent]]
    projectName: NotRequired[str]


# ── RawCIInfo ──────────────────────────────────────────────────────


class RawCIInfo(TypedDict):
    name: str
    url: NotRequired[str]
    buildNumber: NotRequired[str]


# ── RawRun ─────────────────────────────────────────────────────────


class RawRun(TypedDict):
    schemaVersion: int  # must be 1
    testCases: list[RawTestCase]
    projectRoot: str
    startedAtMs: NotRequired[float]
    finishedAtMs: NotRequired[float]
    packageVersion: NotRequired[str]
    gitSha: NotRequired[str]
    ci: NotRequired[RawCIInfo]
    meta: NotRequired[dict[str, Any]]
    # How much of each source file this run covered: "full" (no name filter was
    # applied), "filtered" (one was), or absent when it cannot be determined.
    runScope: NotRequired[str]
    # Every file this run executed a test in, whether or not it produced a
    # story, so a file emptied of scenarios is distinguishable from one that
    # never ran.
    coveredSourceFiles: NotRequired[list[str]]
    # Files this run cannot speak for, so a consumer keeps what they last
    # documented rather than treating the run as authoritative.
    incompleteSourceFiles: NotRequired[list[str]]
