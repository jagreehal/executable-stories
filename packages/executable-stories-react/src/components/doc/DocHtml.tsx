import { useEffect, useRef, useState } from "react";
import type { ReportDocHtml } from "executable-stories-core";
import { safeUrl } from "../../lib/url";

/**
 * Measures the framed page and posts its height out.
 *
 * The frame is `sandbox="allow-scripts"` with no `allow-same-origin`, so it is
 * an opaque origin and the report cannot read into it. Measurement has to run
 * inside the frame and come back by postMessage, which is only possible for
 * HTML the report owns — inline `content`. A remote `url`/`path` page can only
 * do this if its own author opts in, so those keep their declared height.
 *
 * Inlined rather than fetched: the HTML report is a single self-contained file
 * with no CDN and no external requests.
 *
 * The closing tag is written plainly. This module is bundled into the report
 * island, which is inlined into a `<script>` in the report HTML, where a raw
 * `</script>` inside a string would close that tag early. esbuild escapes it on
 * the way out, so hand-escaping here only trips the linter. Checked against the
 * generated bundle rather than assumed.
 */
const MEASURE_SCRIPT =
  "<script>(function(){" +
  "if(parent===window)return;" +
  "var last=0,queued=false;" +
  // Measure the bottom edge of body's children, never the document's own
  // scrollHeight. A standalone artifact routinely sets `html,body{height:100%}`,
  // which makes scrollHeight equal to the frame, so measuring it is a ratchet:
  // the frame grows and can never shrink, because the thing measured is the
  // frame.
  //
  // Zero means there was nothing to measure that way: `content` is any string,
  // so it can be bare text with no element children, or text beside only
  // non-rendered ones (a <style> block, a <script>). Body's own box is what
  // gives that text a box to be measured in. It is the fallback and not the
  // primary because a stretched body is exactly the ratchet above.
  "var measure=function(){" +
  "var kids=document.body.children,h=0;" +
  "for(var i=0;i<kids.length;i++)h=Math.max(h,kids[i].getBoundingClientRect().bottom);" +
  "return Math.ceil(h||document.body.getBoundingClientRect().bottom)};" +
  // Unchanged height posts nothing. That both spares the report a re-render per
  // frame and breaks the feedback loop: resizing the frame resizes a stretched
  // body, which fires the observer again.
  "var post=function(){queued=false;var h=measure();if(h===last)return;last=h;" +
  "parent.postMessage({__esHtmlHeight:h},'*')};" +
  // One measurement per frame: mutations arrive in bursts and each measure
  // forces a layout.
  "var schedule=function(){if(queued)return;queued=true;requestAnimationFrame(post)};" +
  "var start=function(){" +
  // ResizeObserver catches reflow (images, fonts, viewport). MutationObserver
  // catches DOM and style changes, which the observer never sees when body is
  // stretched to the frame and so never changes size itself.
  "new ResizeObserver(schedule).observe(document.body);" +
  "new MutationObserver(schedule).observe(document.body," +
  "{subtree:true,childList:true,attributes:true,characterData:true});" +
  "addEventListener('load',schedule);post()};" +
  "if(document.body)start();else addEventListener('DOMContentLoaded',start)" +
  "})();</script>";

/**
 * The tallest frame the report will grow to. The embedded page is untrusted by
 * construction, so a height it reports is input at a trust boundary: a broken
 * or hostile document claiming 10 million pixels would otherwise take the page
 * with it. Past this the frame scrolls.
 */
const MAX_MEASURED_HEIGHT = 5000;

/**
 * Renders an embedded-HTML doc entry inside a SANDBOXED iframe. All embedded
 * HTML is untrusted, so the frame is `sandbox="allow-scripts"` only (no
 * allow-same-origin) — embedded scripts run (charts work) but can't touch the
 * report DOM, cookies, or storage. Inline `content` → srcdoc (keeps the report
 * self-contained); `url`/`path` → src (scheme-validated).
 */
export function DocHtml({ entry }: { entry: ReportDocHtml }) {
  const declaredHeight =
    typeof entry.height === "number" ? `${entry.height}px` : (entry.height ?? "400px");
  const title = entry.title ?? "Embedded HTML";
  const safeHref = safeUrl(entry.url ?? entry.path);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>();

  // Runs only on the client, so the server and the first client render agree on
  // the declared height and hydration is stable.
  useEffect(() => {
    if (entry.content === undefined) return;

    const onMessage = (event: MessageEvent) => {
      // The frame has an opaque origin (sandboxed without allow-same-origin),
      // so `event.origin` is "null" and proves nothing. Identity comes from the
      // source window instead: this is the only check separating our own frame
      // from every other script on the page posting at us.
      if (event.source !== frameRef.current?.contentWindow) return;

      const reported = (event.data as { __esHtmlHeight?: unknown } | null)?.__esHtmlHeight;
      if (typeof reported !== "number" || !Number.isFinite(reported) || reported <= 0) return;
      setMeasuredHeight(Math.min(reported, MAX_MEASURED_HEIGHT));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [entry.content]);

  const height = measuredHeight === undefined ? declaredHeight : `${measuredHeight}px`;

  // Exactly one of content / url / path is set. A url/path with an unsafe
  // scheme yields no src (the figure still renders, just empty).
  const frameProps =
    entry.content !== undefined
      ? { srcDoc: entry.content + MEASURE_SCRIPT }
      : { src: safeHref ?? "" };

  return (
    <figure className="my-3 overflow-hidden rounded-md border border-border">
      <figcaption className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span>{entry.title ?? "HTML"}</span>
        {safeHref ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open in new tab"
            title="Open in new tab"
            className="text-primary"
          >
            ↗
          </a>
        ) : null}
      </figcaption>
      <iframe
        ref={frameRef}
        {...frameProps}
        sandbox="allow-scripts"
        loading="lazy"
        title={title}
        className="block w-full border-0"
        // Embedded HTML is authored standalone, so it assumes a light page. An
        // iframe with no background inherits the host's dark canvas (via the
        // report's `color-scheme`), leaving that authored dark text unreadable.
        style={{ height, colorScheme: "light", background: "#fff" }}
      />
    </figure>
  );
}
