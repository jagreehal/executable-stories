import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

const CountrySchema = z.object({
  name: z.string(),
  cca2: z.string(),
  capital: z.string(),
  region: z.string(),
  languages: z.record(z.string(), z.string()),
  flag: z.string().optional(),
});

const CountriesSchema = z.array(CountrySchema);

const ErrorBodySchema = z.object({ message: z.string() });

const PAGE_SIZE = 10;

async function fetchCountries() {
  const res = await fetch('/api/countries');

  if (!res.ok) {
    const body = ErrorBodySchema.safeParse(await res.json().catch(() => null));
    throw new Error(body.success ? body.data.message : `Request failed (${res.status})`);
  }

  return CountriesSchema.parse(await res.json());
}

/** All UI state lives in the URL, so scenarios (and links) can set it. */
function useUrlState() {
  const [params, setParams] = useState(() => new URLSearchParams(location.search));

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);

    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }

    history.replaceState(history.state, '', `?${next}`);
    setParams(next);
  };

  return [params, set] as const;
}

export function App() {
  const [params, set] = useUrlState();

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  });

  const q = params.get('q') ?? '';
  const region = params.get('region') ?? '';
  const langs = params.get('lang')?.split(',').filter(Boolean) ?? [];
  const filtersOpen = params.get('filters') === 'open';

  const countries = data ?? [];

  const matches = countries.filter(
    (c) =>
      c.name.toLowerCase().startsWith(q.toLowerCase())
      && (!region || c.region === region)
      && langs.every((l) => l in c.languages),
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.get('page')) || 1), totalPages);
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const regions = [...new Set(countries.map((c) => c.region))].filter(Boolean).toSorted();

  const languages = [...new Map(countries.flatMap((c) => Object.entries(c.languages)))].toSorted((a, b) =>
    a[1].localeCompare(b[1])
  );

  return (
    <>
      <header className='site-header'>
        <h1>Who speaks what</h1>
        <input
          type='search'
          aria-label='Search countries'
          placeholder='Search countries…'
          value={q}
          onChange={(e) => set({ q: e.target.value, page: null })}
        />
      </header>

      <div className='layout'>
        <aside>
          <button
            className='filters-toggle'
            aria-expanded={filtersOpen}
            onClick={() => set({ filters: filtersOpen ? null : 'open' })}
          >
            Filters {langs.length + (region ? 1 : 0) > 0 && `(${langs.length + (region ? 1 : 0)})`}
          </button>
          {filtersOpen && (
            <form className='filters' onSubmit={(e) => e.preventDefault()}>
              <fieldset>
                <legend>Region</legend>
                {['', ...regions].map((r) => (
                  <label key={r}>
                    <input
                      type='radio'
                      name='region'
                      checked={region === r}
                      onChange={() => set({ region: r || null, page: null })}
                    />
                    {r || 'All'}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>
                  Languages
                  {langs.length > 0 && (
                    <button
                      type='button'
                      className='link'
                      onClick={() => set({ lang: null, page: null })}
                    >
                      Clear all
                    </button>
                  )}
                </legend>
                <div className='languages'>
                  {languages.map(([code, label]) => (
                    <label key={code}>
                      <input
                        type='checkbox'
                        checked={langs.includes(code)}
                        onChange={() =>
                          set({
                            lang: (langs.includes(code)
                              ? langs.filter((l) => l !== code)
                              : [...langs, code]).join(','),
                            page: null,
                          })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </form>
          )}
        </aside>

        <main>
          {isPending
            ? <p role='status' className='status'>Loading countries…</p>
            : error && !data
            ? (
              <div role='alert' className='error'>
                <p>Couldn’t load countries: {error.message}</p>
                <button onClick={() => refetch()}>Retry</button>
              </div>
            )
            : (
              <>
                <div className='summary'>
                  <h2>
                    {matches.length} {matches.length === 1 ? 'country' : 'countries'}
                    {q && ` beginning with “${q}”`}
                  </h2>
                  {isFetching && <span role='status' className='refreshing'>Refreshing…</span>}
                  {totalPages > 1 && (
                    <span>
                      Page {page} of {totalPages}
                    </span>
                  )}
                </div>

                {matches.length === 0 && <p className='empty'>No countries match. Try fewer filters.</p>}

                <ul className='cards'>
                  {shown.map((c) => (
                    <li key={c.cca2 + c.name} className='card'>
                      <div className='card-head'>
                        {c.flag
                          ? <img src={c.flag} alt='' />
                          : <span className='flag' aria-hidden>{flagEmoji(c.cca2)}</span>}
                        <h3>{c.name}</h3>
                      </div>
                      <dl>
                        <dt>Capital</dt>
                        <dd>{c.capital || '—'}</dd>
                        <dt>Region</dt>
                        <dd>{c.region || '—'}</dd>
                        <dt>Languages</dt>
                        <dd>{Object.values(c.languages).join(', ') || '—'}</dd>
                      </dl>
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <nav aria-label='Pages' className='pages'>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        aria-current={n === page ? 'page' : undefined}
                        onClick={() => set({ page: String(n) })}
                      >
                        {n}
                      </button>
                    ))}
                  </nav>
                )}
              </>
            )}
        </main>
      </div>
    </>
  );
}

// Regional indicator symbols: "FR" becomes the French flag. Codes are ASCII letters.
const flagEmoji = (cca2: string) =>
  String.fromCodePoint(...cca2.toUpperCase().split('').map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
