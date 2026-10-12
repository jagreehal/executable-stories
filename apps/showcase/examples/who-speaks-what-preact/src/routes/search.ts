/** Keep the search in the URL (?q=), alongside any scenario params, so it survives a reload. */
export function writeSearch(text: string) {
  const url = new URL(globalThis.location.href);

  if (text) url.searchParams.set('q', text);
  else url.searchParams.delete('q');
  history.replaceState(history.state, '', url);
}

export const readSearch = () => new URL(globalThis.location.href).searchParams.get('q') ?? '';
