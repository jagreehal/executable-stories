import { scenarioJsonSchema } from 'executable-stories-showcase';
import { tanstackQueryState } from 'executable-stories-showcase/tanstack-query';

/** The JSON Schema for this app's scenarios, including adapter state. */
export const demoJsonSchema = () => scenarioJsonSchema({ state: { 'tanstack-query': tanstackQueryState } });
