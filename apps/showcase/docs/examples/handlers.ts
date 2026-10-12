import { type ScenarioInput, startScenarios } from 'executable-stories-showcase';
import { statementsEmpty } from './test/handlers'; // the handlers your unit tests use

const scenarios: ScenarioInput[] = [
  { name: 'no-statements', handlers: ['statementsEmpty'], ready: 'text=No statements yet' },
];

await startScenarios({ scenarios, handlers: { statementsEmpty } });
