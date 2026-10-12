import { render } from 'preact';
import { startScenarios } from 'executable-stories-showcase';
import { mountPanel } from 'executable-stories-showcase/panel';
import { App } from './app';
import { scenarios } from './scenarios';
import './styles.css';

// State-only scenarios: nothing is mocked, so MSW never loads.
// A real app would only do this in development: if (import.meta.env.DEV) { ... }
const session = await startScenarios({ scenarios, defaultScenario: 'default-state' });

mountPanel(session);

const root = document.getElementById('app');

if (root) render(<App />, root);
