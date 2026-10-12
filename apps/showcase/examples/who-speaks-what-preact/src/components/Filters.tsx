import { COUNTRIES } from '../countries';
import type { PageAction, PageState } from '../schema';

const regions = [...new Set(COUNTRIES.map((c) => c.region))].filter(Boolean).toSorted();

const languages = [...new Map(COUNTRIES.flatMap((c) => Object.entries(c.languages)))].toSorted((a, b) =>
  a[1].localeCompare(b[1])
);

export function Filters({ state, dispatch }: { state: PageState; dispatch: (action: PageAction) => void; }) {
  const { filters, isFilterOpen } = state;
  const selected = Object.keys(filters.languages).length;

  return (
    <aside class='w-full shrink-0 rounded-xl bg-gray-900 text-gray-100 xl:w-72'>
      <header class='flex items-center gap-3 p-4'>
        <button
          type='button'
          aria-expanded={isFilterOpen}
          aria-controls='filter-panel'
          class='rounded px-2 xl:hidden'
          onClick={() => dispatch({ type: 'filtersOpen', open: !isFilterOpen })}
        >
          {isFilterOpen ? '▲' : '▼'}
          <span class='sr-only'>Toggle filters</span>
        </button>
        <h2 class='text-lg font-bold tracking-wide uppercase'>Filters</h2>
      </header>
      <div id='filter-panel' class={`${isFilterOpen ? 'block' : 'hidden'} xl:block`}>
        <fieldset class='border-t border-gray-800 p-4'>
          <legend class='sr-only'>Region</legend>
          <p class='mb-2 text-sm font-semibold text-gray-400'>Region</p>
          {['', ...regions].map((region) => (
            <label key={region} class='flex items-center gap-2 py-1'>
              <input
                type='radio'
                name='region'
                checked={filters.region === region}
                onChange={() => dispatch({ type: 'region', region })}
                class='border-gray-700 bg-gray-800 text-blue-500'
              />
              {region || 'All'}
            </label>
          ))}
        </fieldset>
        <fieldset class='max-h-80 overflow-y-auto border-t border-gray-800 p-4 xl:max-h-[50vh]'>
          <legend class='sr-only'>Languages</legend>
          <div class='mb-2 flex items-center justify-between text-sm font-semibold text-gray-400'>
            <span>Languages</span>
            {selected > 0 && (
              <button
                type='button'
                class='underline'
                onClick={() => dispatch({ type: 'clearLanguages' })}
              >
                Clear all ({selected})
              </button>
            )}
          </div>
          <div class='grid grid-cols-2 gap-x-4 sm:grid-cols-3 xl:grid-cols-1'>
            {languages.map(([code, name]) => (
              <label key={code} class='flex items-center gap-2 py-1'>
                <input
                  type='checkbox'
                  checked={code in filters.languages}
                  onChange={() => dispatch({ type: 'toggleLanguage', code, name })}
                  class='rounded border-gray-700 bg-gray-800 text-blue-500'
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </aside>
  );
}

export function FilterPills(
  { state, dispatch }: { state: PageState; dispatch: (action: PageAction) => void; },
) {
  const { region, languages } = state.filters;
  const chosen = Object.entries(languages).toSorted((a, b) => a[1].localeCompare(b[1]));

  if (!region && chosen.length === 0) return null;

  return (
    <div class='mb-6 flex flex-wrap items-center gap-2'>
      <h3 class='mr-1 font-bold'>Filters:</h3>
      {region && (
        <button type='button' class={pill} onClick={() => dispatch({ type: 'region', region: '' })}>
          🌎 {region} <span aria-hidden='true'>×</span>
        </button>
      )}
      {chosen.map(([code, name]) => (
        <button
          key={code}
          type='button'
          class={pill}
          onClick={() => dispatch({ type: 'toggleLanguage', code, name })}
        >
          💬 {name} <span aria-hidden='true'>×</span>
        </button>
      ))}
    </div>
  );
}

const pill =
  'rounded-full bg-gray-200 px-3 py-1 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200';
