export function formatCliError(message: string, json: boolean): string {
  if (json) return JSON.stringify({ ok: false, error: message }, null, 2);
  return `Error: ${message}`;
}
