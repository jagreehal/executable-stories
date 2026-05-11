// Vercel rendering-hoist-jsx: module-level constants avoid re-creating the
// style object on every render.
const NAV_STYLE: React.CSSProperties = {
  padding: "1.5rem",
  borderBottom: "1px solid var(--es-color-border)",
};

export function ExampleNav() {
  return (
    <nav style={NAV_STYLE}>
      <strong>react-report-example</strong>
      {" · "}
      <a href="/">Static</a>
      {" · "}
      <a href="/interactive">Interactive</a>
    </nav>
  );
}
