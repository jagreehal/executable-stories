import { parseJson, type ScenarioInput } from 'executable-stories-showcase';
import { COUNTRIES } from './countries';
import { initialPageState } from './page';
import type { Country, PageState } from './schema';

const withCountries = (countries: Country[]): PageState => ({
  ...initialPageState,
  searchState: { status: 'success', countries },
});

const kashyyyk: Country = {
  name: 'Kashyyyk',
  cca2: 'KA',
  flag: '/assets/kashyyyk.png',
  capital: 'Rwookrrorro',
  region: 'New Republic',
  languages: { shy: 'Shyriiwook' },
};

/** Page presets, as scenarios. */
const presets: { name: string; description: string; page: PageState; ready: string; }[] = [
  {
    name: 'default-state',
    description: 'Every country',
    page: initialPageState,
    ready: 'text=248 countries',
  },
  { name: 'no-results', description: 'Nothing to show', page: withCountries([]), ready: 'text=0 countries' },
  {
    name: 'one-country',
    description: 'A single result, singular copy',
    page: withCountries(COUNTRIES.slice(0, 1)),
    ready: 'text=1 country',
  },
  {
    name: 'five-countries',
    description: 'One page of results',
    page: withCountries(COUNTRIES.slice(0, 5)),
    ready: 'text=5 countries',
  },
  {
    name: 'twenty-one-countries',
    description: 'Pagination boundary: three pages',
    page: withCountries(COUNTRIES.slice(0, 21)),
    ready: 'text=21 countries',
  },
  {
    name: 'lots-of-countries',
    description: 'Ten copies of the dataset: 2,480 countries',
    page: withCountries(Array.from({ length: 10 }, () => COUNTRIES).flat()),
    ready: 'text=2480 countries',
  },
  {
    name: 'search-term',
    description: 'A search the URL and the results agree on',
    page: { ...withCountries(COUNTRIES.filter((c) => c.name.startsWith('United'))), searchText: 'United' },
    ready: 'text=beginning with',
  },
  {
    name: 'geek-country',
    description: "Chewbacca's home planet, with an image flag",
    page: withCountries([kashyyyk]),
    ready: 'text=Kashyyyk',
  },
  {
    name: 'filters-open-all-languages',
    description: 'Filter panel open with every language selected',
    page: {
      ...initialPageState,
      isFilterOpen: true,
      filters: {
        region: '',
        languages: Object.fromEntries(COUNTRIES.flatMap((c) => Object.entries(c.languages))),
      },
      searchState: { status: 'success', countries: [] },
    },
    ready: 'text=0 countries',
  },
  {
    name: 'loading',
    description: 'Results still on their way',
    page: { ...initialPageState, searchState: { status: 'loading' } },
    ready: 'role=status',
  },
  {
    name: 'error',
    description: 'The search failed',
    page: { ...initialPageState, searchState: { status: 'error', message: 'Server is busy' } },
    ready: 'text=Server is busy',
  },
];

// Scenarios are JSON; the round trip drops undefined fields such as a missing `flag`.
export const scenarios: ScenarioInput[] = presets.map(({ name, description, ready, page }) => ({
  name,
  description,
  ready,
  state: { page: parseJson(JSON.stringify(page)) },
}));
