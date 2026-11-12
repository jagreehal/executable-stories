"use client";

import { Component, type ReactNode } from "react";
import { ReportSchemaError } from "../components/ReportSchemaError";

/**
 * Shows an error with a next step when a record from the accumulated run state
 * cannot render.
 */
export class ReportErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <ReportSchemaError
        error={{
          code: "INVALID_INPUT",
          message: `The report data has a record this version cannot render (${error.message}). Regenerate the report; if it persists, run "executable-stories runs reset" and re-run the suite.`,
        }}
      />
    );
  }
}
