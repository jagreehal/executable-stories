/**
 * Formatters - Layer 3.
 *
 * Transform canonical TestRunResult into various output formats.
 */

export {
  CucumberJsonFormatter,
  type CucumberJsonOptions,
} from "./cucumber-json";

export {
  JUnitFormatter,
  type JUnitOptions,
} from "./junit-xml";

export {
  MarkdownFormatter,
  type MarkdownOptions,
} from "./markdown";

export {
  CucumberMessagesFormatter,
  type CucumberMessagesOptions,
} from "./cucumber-messages/index";

export {
  CucumberHtmlFormatter,
  type CucumberHtmlOptions,
} from "./cucumber-html";

export {
  AstroFormatter,
  type AstroFormatterOptions,
  type StarlightBadge,
} from "./astro";

export {
  ConfluenceFormatter,
  type ConfluenceFormatterOptions,
} from "./confluence";
