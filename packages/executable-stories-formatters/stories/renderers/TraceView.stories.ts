import { renderTraceView } from "../../src/formatters/html/renderers/trace-view";
import { escapeHtml } from "../../src/formatters/html/template";
import type { Meta, StoryObj } from "@storybook/html";
import type { OtelSpan } from "../../src/types/otel";

const meta: Meta = { title: "Renderers/TraceView" };
export default meta;

const deps = { escapeHtml };

const t0 = 1_700_000_000_000;

const happyPath: OtelSpan[] = [
  {
    spanId: "root",
    name: "POST /api/login",
    startTimeMs: t0,
    durationMs: 180,
    status: "ok",
    attributes: { "http.method": "POST", "http.status_code": 200 },
  },
  {
    spanId: "auth",
    parentSpanId: "root",
    name: "authService.verify",
    startTimeMs: t0 + 10,
    durationMs: 65,
    status: "ok",
  },
  {
    spanId: "db",
    parentSpanId: "auth",
    name: "SELECT users WHERE email = ?",
    startTimeMs: t0 + 25,
    durationMs: 40,
    status: "ok",
    attributes: { "db.system": "postgres", "db.rows": 1 },
  },
  {
    spanId: "session",
    parentSpanId: "root",
    name: "sessionStore.create",
    startTimeMs: t0 + 100,
    durationMs: 70,
    status: "ok",
  },
];

const errorPath: OtelSpan[] = [
  {
    spanId: "root",
    name: "POST /api/checkout",
    startTimeMs: t0,
    durationMs: 1450,
    status: "error",
    statusMessage: "PaymentDeclined",
  },
  {
    spanId: "cart",
    parentSpanId: "root",
    name: "cart.compute",
    startTimeMs: t0 + 5,
    durationMs: 35,
    status: "ok",
  },
  {
    spanId: "payment",
    parentSpanId: "root",
    name: "stripe.charge",
    startTimeMs: t0 + 50,
    durationMs: 1380,
    status: "error",
    statusMessage: "card_declined",
    attributes: { "stripe.code": "card_declined" },
  },
];

export const HappyPath: StoryObj = {
  render: () => renderTraceView({ spans: happyPath }, deps),
};

export const WithError: StoryObj = {
  render: () => renderTraceView({ spans: errorPath }, deps),
};

export const Empty: StoryObj = {
  render: () => {
    const html = renderTraceView({ spans: [] }, deps);
    return (
      html ||
      '<p style="color:var(--muted-foreground)">No spans — nothing rendered.</p>'
    );
  },
};
