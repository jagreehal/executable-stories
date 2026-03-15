/**
 * Default theme — wraps the existing CSS_STYLES.
 */

import type { HtmlTheme } from "./types.js";
import { CSS_STYLES } from "../styles.js";

export const defaultTheme: HtmlTheme = {
  name: "default",
  label: "Default",
  css: CSS_STYLES,
};
