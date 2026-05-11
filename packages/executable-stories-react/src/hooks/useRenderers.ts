import { useContext } from "react";
import { ReportContext } from "../context/ReportContext";
import type { BuiltinRenderers, CustomRenderers } from "../renderers";

const EMPTY_CUSTOM: CustomRenderers = {};
const EMPTY_RENDERERS: BuiltinRenderers = {};

export function useCustomRenderers(): CustomRenderers {
  const ctx = useContext(ReportContext);
  return ctx?.customRenderers ?? EMPTY_CUSTOM;
}

export function useBuiltinRenderers(): BuiltinRenderers {
  const ctx = useContext(ReportContext);
  return ctx?.renderers ?? EMPTY_RENDERERS;
}
