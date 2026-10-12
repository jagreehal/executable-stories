/** Page numbers around the current one, with 0 standing for an ellipsis. */
export function pageRange(current: number, last: number, delta = 3): number[] {
  const middle = Array.from(
    { length: Math.max(0, Math.min(last - 1, current + delta) - Math.max(2, current - delta) + 1) },
    (_, i) => Math.max(2, current - delta) + i,
  );

  return [
    1,
    ...(current - delta > 2 ? [0] : []),
    ...middle,
    ...(current + delta < last - 1 ? [0] : []),
    ...(last > 1 ? [last] : []),
  ];
}

export function Pagination(
  { current, last, onPage }: { current: number; last: number; onPage: (page: number) => void; },
) {
  return (
    <nav aria-label='Pages' class='flex flex-wrap items-center gap-1'>
      {pageRange(current, last).map((page, i) =>
        page === 0
          ? <span key={`gap-${i}`} class='px-2 text-blue-500'>…</span>
          : (
            <button
              key={page}
              type='button'
              aria-current={page === current ? 'page' : undefined}
              onClick={() => onPage(page)}
              class='rounded px-2 py-1 text-blue-500 aria-[current=page]:bg-blue-500 aria-[current=page]:font-bold aria-[current=page]:text-white'
            >
              {page}
            </button>
          )
      )}
    </nav>
  );
}
