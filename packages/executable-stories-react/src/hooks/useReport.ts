import { useContext } from "react";
import { ReportContext } from "../context/ReportContext";

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) {
    throw new Error(
      "useReport must be used inside <ReportRoot> or <Report>. Wrap your tree with one of those.",
    );
  }
  return ctx.report;
}
