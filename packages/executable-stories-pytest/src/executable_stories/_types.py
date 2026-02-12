"""Type definitions matching the raw-run.schema.json schema.

These are plain TypedDicts used for documentation and type-checking.
At runtime everything is just dicts serialized to JSON.
"""

from __future__ import annotations

from typing import Any, TypedDict, NotRequired


# ── DocEntry variants ──────────────────────────────────────────────


class NoteDoc(TypedDict):
    kind: str  # "note"
    text: str
    phase: str  # "static" | "runtime"


class TagDoc(TypedDict):
    kind: str  # "tag"
    names: list[str]
    phase: str


class KvDoc(TypedDict):
    kind: str  # "kv"
    label: str
    value: Any
    phase: str


class CodeDoc(TypedDict):
    kind: str  # "code"
    label: str
    content: str
    phase: str
    lang: NotRequired[str]


class TableDoc(TypedDict):
    kind: str  # "table"
    label: str
    columns: list[str]
    rows: list[list[str]]
    phase: str


class LinkDoc(TypedDict):
    kind: str  # "link"
    label: str
    url: str
    phase: str


class SectionDoc(TypedDict):
    kind: str  # "section"
    title: str
    markdown: str
    phase: str


class MermaidDoc(TypedDict):
    kind: str  # "mermaid"
    code: str
    phase: str
    title: NotRequired[str]


class ScreenshotDoc(TypedDict):
    kind: str  # "screenshot"
    path: str
    phase: str
    alt: NotRequired[str]


class CustomDoc(TypedDict):
    kind: str  # "custom"
    type: str
    data: Any
    phase: str


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
    | CustomDoc
)


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
    durationMs: NotRequired[float]
    docs: NotRequired[list[DocEntry]]


# ── StoryMeta ──────────────────────────────────────────────────────


class StoryMeta(TypedDict):
    scenario: str
    steps: NotRequired[list[StoryStep]]
    tags: NotRequired[list[str]]
    tickets: NotRequired[list[str]]
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
