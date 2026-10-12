import { z } from 'zod';

export const CountrySchema = z.object({
  name: z.string(),
  cca2: z.string(),
  capital: z.string(),
  region: z.string(),
  languages: z.record(z.string(), z.string()),
  /** Image path, for countries without a flag emoji (Kashyyyk). */
  flag: z.string().optional(),
});

export type Country = z.infer<typeof CountrySchema>;

const SearchStateSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('loading') }),
  z.object({ status: z.literal('error'), message: z.string() }),
  z.object({ status: z.literal('success'), countries: z.array(CountrySchema) }),
]);

/** Everything the page shows. Scenarios set it whole; the reducer and the machine both own one. */
export const PageStateSchema = z.object({
  searchText: z.string(),
  currentPage: z.number().int().min(1),
  isFilterOpen: z.boolean(),
  filters: z.object({ region: z.string(), languages: z.record(z.string(), z.string()) }),
  searchState: SearchStateSchema,
});

export type PageState = z.infer<typeof PageStateSchema>;

export type PageAction =
  | { type: 'search'; searchText: string; }
  | { type: 'page'; page: number; }
  | { type: 'region'; region: string; }
  | { type: 'toggleLanguage'; code: string; name: string; }
  | { type: 'clearLanguages'; }
  | { type: 'filtersOpen'; open: boolean; }
  | { type: 'set'; state: PageState; };
