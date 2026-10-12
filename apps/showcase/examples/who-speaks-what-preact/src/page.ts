import { COUNTRIES } from './countries';
import type { Country, PageAction, PageState } from './schema';

export const PAGE_SIZE = 10;

export function filterCountries(
  countries: Country[],
  { searchText, filters }: Pick<PageState, 'searchText' | 'filters'>,
) {
  const q = searchText.toLowerCase();
  const codes = Object.keys(filters.languages);

  return countries.filter((country) =>
    country.name.toLowerCase().startsWith(q)
    && (!filters.region || country.region === filters.region)
    && codes.every((code) => code in country.languages)
  );
}

export const initialPageState: PageState = {
  searchText: '',
  currentPage: 1,
  isFilterOpen: false,
  filters: { region: '', languages: {} },
  searchState: { status: 'success', countries: COUNTRIES },
};

/** Search and filters run over the full dataset. */
function withResults(state: PageState): PageState {
  return {
    ...state,
    currentPage: 1,
    searchState: { status: 'success', countries: filterCountries(COUNTRIES, state) },
  };
}

export function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'search':
      return withResults({ ...state, searchText: action.searchText, filters: initialPageState.filters });
    case 'page':
      return { ...state, currentPage: action.page };
    case 'region':
      return withResults({ ...state, filters: { ...state.filters, region: action.region } });
    case 'toggleLanguage': {
      const { [action.code]: selected, ...rest } = state.filters.languages;
      const languages = selected === undefined ? { ...rest, [action.code]: action.name } : rest;

      return withResults({ ...state, filters: { ...state.filters, languages } });
    }

    case 'clearLanguages':
      return withResults({ ...state, filters: { ...state.filters, languages: {} } });
    case 'filtersOpen':
      return { ...state, isFilterOpen: action.open };
    case 'set':
      return action.state;
    default:
      return assertNever(action);
  }
}

/** Compile-time exhaustiveness: a new action type that isn't handled fails to typecheck. */
function assertNever(action: never): never {
  throw new Error(`Unhandled page action: ${JSON.stringify(action)}`);
}
