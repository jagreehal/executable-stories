import { describe, it, expect } from "vitest";
import { scanHtmlAssets } from "../../src/bundler/scan-html-assets";

describe("scanHtmlAssets", () => {
  it("finds video src attributes", () => {
    const html = `<video class="attachment-video" controls src="../test-results/login-flow/video.webm"></video>`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../test-results/login-flow/video.webm"]);
  });

  it("finds img src attributes with local paths", () => {
    const html = `<img src="../screenshots/step-1.png" alt="Screenshot" class="doc-screenshot-img" />`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../screenshots/step-1.png"]);
  });

  it("finds attachment href attributes with local paths", () => {
    const html = `<a class="attachment" href="../test-results/trace/trace.zip">trace</a>`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../test-results/trace/trace.zip"]);
  });

  it("finds iframe src attributes with local paths (doc-html entries)", () => {
    const html = `<iframe class="doc-html-frame" sandbox="allow-scripts" loading="lazy" style="height: 400px;" title="Coverage" src="../reports/coverage.html"></iframe>`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../reports/coverage.html"]);
  });

  it("skips iframe srcdoc content", () => {
    const html = `<iframe class="doc-html-frame" sandbox="allow-scripts" srcdoc="&lt;h1&gt;Chart&lt;/h1&gt;"></iframe>`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual([]);
  });

  it("skips data: URIs", () => {
    const html = `<img src="data:image/png;base64,iVBOR..." alt="Screenshot" />`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual([]);
  });

  it("skips http/https URLs", () => {
    const html = `<img src="https://example.com/image.png" /><video src="http://cdn.example.com/video.webm"></video>`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual([]);
  });

  it("skips empty src", () => {
    const html = `<img src="" />`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual([]);
  });

  it("skips fragment-only references", () => {
    const html = `<a href="#section-1">Jump</a>`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual([]);
  });

  it("deduplicates repeated references", () => {
    const html = `
      <img src="../screenshots/step-1.png" />
      <img src="../screenshots/step-1.png" />
    `;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../screenshots/step-1.png"]);
  });

  it("finds multiple different assets", () => {
    const html = `
      <video class="attachment-video" controls src="../test-results/login/video.webm"></video>
      <img src="../screenshots/step-1.png" class="doc-screenshot-img" />
      <a class="attachment" href="../test-results/checkout/video.webm">video</a>
    `;
    const refs = scanHtmlAssets(html);
    expect(refs).toHaveLength(3);
    expect(refs).toContain("../test-results/login/video.webm");
    expect(refs).toContain("../screenshots/step-1.png");
    expect(refs).toContain("../test-results/checkout/video.webm");
  });

  it("handles single-quoted attributes", () => {
    const html = `<img src='../screenshots/step-1.png' />`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../screenshots/step-1.png"]);
  });

  it("finds attachment href attributes when the class attribute uses single quotes", () => {
    const html = `<a class='attachment' href='../test-results/trace/trace.zip'>trace</a>`;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../test-results/trace/trace.zip"]);
  });

  it("skips doc-link anchors without attachment class", () => {
    const html = `
      <div class="doc-link">
        <a href="../docs/runbook.md" target="_blank" rel="noopener noreferrer">Runbook</a>
      </div>
    `;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual([]);
  });

  it("skips plain anchors but finds attachment anchors", () => {
    const html = `
      <a href="../docs/spec.md">Spec</a>
      <a class="attachment" href="../test-results/trace.zip">trace</a>
      <a href="../docs/readme.md">Readme</a>
    `;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["../test-results/trace.zip"]);
  });

  it("ignores src=-like text inside <script> and <style> blocks", () => {
    // The interactive island inlines minified JS that contains src= patterns;
    // only the real element outside the script should be returned.
    const html = `
      <img src="assets/real.png">
      <script>var t='<video src="${"${e}"}"></video>'; createElement('img',{src:'fake.png'});</script>
      <style>.x{background:url(also-fake.png)}</style>
    `;
    const refs = scanHtmlAssets(html);
    expect(refs).toEqual(["assets/real.png"]);
  });
});
