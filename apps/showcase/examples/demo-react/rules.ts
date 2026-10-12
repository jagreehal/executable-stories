import { defineScenarioRules } from 'executable-stories-showcase';
import { z } from 'zod';

const CountryCodesSchema = z.array(z.object({ cca2: z.string() }));

/** Business rules a schema can't express. Checked whenever a scenario resolves. */
export const rules = defineScenarioRules([
  // The UI keys cards by country code, so the API must never repeat one.
  (s) =>
    (s.network ?? [])
      .filter((e) => e.path === '/api/countries')
      .flatMap((e) => e.sequence ?? (e.response ? [e.response] : []))
      .flatMap((r) => {
        const countries = CountryCodesSchema.safeParse(r.body);

        if (!countries.success) return [];
        const codes = countries.data.map((c) => c.cca2);
        const dupes = [...new Set(codes.filter((c, i) => codes.indexOf(c) !== i))];

        return dupes.length ? [`/api/countries repeats cca2: ${dupes.join(', ')}`] : [];
      }),
]);
