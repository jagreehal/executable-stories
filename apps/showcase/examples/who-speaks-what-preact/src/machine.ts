import { assign, setup } from 'xstate';
import { initialPageState, pageReducer } from './page';
import type { PageAction, PageState } from './schema';

/** Gives XState a value of each type to infer from; the machine never reads them. */
const typeOf = <T>(value: T): T => value;

/** The same page logic as the reducer, as an XState 5 machine. */
export const pageMachine = setup({
  types: {
    context: typeOf<PageState>(initialPageState),
    events: typeOf<PageAction>({ type: 'clearLanguages' }),
  },
}).createMachine({
  id: 'page',
  context: initialPageState,
  on: {
    '*': { actions: assign(({ context, event }) => pageReducer(context, event)) },
  },
});
