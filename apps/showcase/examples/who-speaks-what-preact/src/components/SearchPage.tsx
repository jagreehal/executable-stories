import { PAGE_SIZE } from '../page';
import type { Country, PageAction, PageState } from '../schema';
import { CountryCard } from './CountryCard';
import { FilterPills, Filters } from './Filters';
import { Pagination } from './Pagination';
import { SiteHeader } from './SiteHeader';

/** The whole page, drawn from a PageState. The reducer and XState routes both render it. */
export function SearchPage(
  { state, dispatch, onSearch }: {
    state: PageState;
    dispatch: (action: PageAction) => void;
    onSearch: (text: string) => void;
  },
) {
  const { searchState } = state;

  return (
    <>
      <SiteHeader searchText={state.searchText} onSearch={onSearch} />
      <div class='mx-auto flex max-w-7xl flex-col gap-6 p-4 xl:flex-row'>
        {searchState.status === 'success' && <Filters state={state} dispatch={dispatch} />}
        <main class='min-w-0 flex-1'>
          <FilterPills state={state} dispatch={dispatch} />
          {searchState.status === 'loading' && (
            <div role='status' class='flex flex-col items-center gap-4 pt-12'>
              <div class='size-24 animate-spin rounded-full border-[12px] border-gray-200 border-t-gray-700' />
              Loading countries…
            </div>
          )}
          {searchState.status === 'error' && (
            <div role='alert' class='pt-12 text-center'>
              <p class='text-3xl'>
                Oh no: <span class='font-bold'>{searchState.message}</span>
              </p>
              <p class='mt-4 text-xl text-gray-600 dark:text-gray-400'>We're working on a fix.</p>
            </div>
          )}
          {searchState.status === 'success' && (
            <Results
              countries={searchState.countries}
              state={state}
              onPage={(page) => dispatch({ type: 'page', page })}
            />
          )}
        </main>
      </div>
    </>
  );
}

function Results(
  { countries, state, onPage }: {
    countries: Country[];
    state: PageState;
    onPage: (page: number) => void;
  },
) {
  const last = Math.max(1, Math.ceil(countries.length / PAGE_SIZE));
  const page = Math.min(state.currentPage, last);
  const shown = countries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section aria-labelledby='results'>
      <div class='flex flex-wrap items-baseline justify-between gap-4'>
        <h2 id='results' class='text-3xl'>
          <span class='font-bold'>{countries.length}</span>
          {countries.length === 1 ? ' country' : ' countries'}
          {state.searchText && ` beginning with ${state.searchText}`}
        </h2>
        {last > 1 && <span class='text-lg'>Page {page} of {last}</span>}
      </div>
      {countries.length === 0 && (
        <p class='mt-8 text-center text-xl'>No countries match. Try fewer filters.</p>
      )}
      {last > 1 && (
        <div class='mt-4 flex justify-center'>
          <Pagination current={page} last={last} onPage={onPage} />
        </div>
      )}
      <ul class='mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {shown.map((country, i) => <CountryCard key={`${country.cca2}-${i}`} country={country} />)}
      </ul>
    </section>
  );
}
