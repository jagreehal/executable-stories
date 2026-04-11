/**
 * Render table of contents sidebar (fn(args, deps)).
 */

import type { TestRunResult, TestStatus } from "../../../types/test-result.js";
import { slugify } from "../../../converters/acl/ids.js";

export interface RenderTocArgs {
  run: TestRunResult;
}

export interface RenderTocDeps {
  escapeHtml: (str: string) => string;
  getStatusIcon: (status: TestStatus) => string;
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

export function renderToc(args: RenderTocArgs, deps: RenderTocDeps): string {
  const { run } = args;
  if (run.testCases.length === 0) return "";

  const byFile = groupBy(run.testCases, (tc) => tc.sourceFile);
  const features: string[] = [];

  for (const [file, testCases] of byFile) {
    const suitePaths = testCases
      .map((tc) => tc.titlePath)
      .filter((p) => p.length > 0);
    const featureName =
      suitePaths.length > 0 && suitePaths[0].length > 0
        ? suitePaths[0][0]
        : file.split("/").pop()?.replace(/\.[^.]+$/, "") ?? file;

    const featureSlug = `feature-${slugify(file)}`;

    const scenarios = testCases
      .map((tc) => {
        const statusIcon = deps.getStatusIcon(tc.status);
        const statusClass = `status-${tc.status}`;
        const failedClass = tc.status === "failed" ? " toc-failed" : "";
        return `<a class="toc-scenario${failedClass}" href="#scenario-${tc.id}">
          <span class="toc-status ${statusClass}">${statusIcon}</span>
          ${deps.escapeHtml(tc.story.scenario)}
        </a>`;
      })
      .join("\n");

    features.push(`<div class="toc-feature">
      <button class="toc-feature-toggle" aria-expanded="true" onclick="this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); this.nextElementSibling.style.display = this.getAttribute('aria-expanded') === 'true' ? '' : 'none'" data-feature="#${featureSlug}">
        ${deps.escapeHtml(featureName)}
      </button>
      <div class="toc-scenarios">
        ${scenarios}
      </div>
    </div>`);
  }

  return `<nav class="toc-sidebar" aria-label="Table of contents">
  <div class="toc-header">
    <a href="#" class="toc-title" onclick="window.scrollTo({top:0,behavior:'smooth'});return false;">Contents</a>
  </div>
  <div class="toc-body">
    ${features.join("\n")}
  </div>
</nav>`;
}
