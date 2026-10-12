import { useMachine } from '@xstate/react';
import { useEffect } from 'preact/hooks';
import { useScenarioState } from 'executable-stories-showcase-react';
import { SearchPage } from '../components/SearchPage';
import { pageMachine } from '../machine';
import { PageStateSchema } from '../schema';
import { readSearch, writeSearch } from './search';

/** The same page, with its state in an XState 5 machine. */
export function XStatePage() {
  const [snapshot, send] = useMachine(pageMachine);
  useEffect(() => {
    const searchText = readSearch();

    if (searchText) send({ type: 'search', searchText });
  }, [send]);
  // Scenarios set the machine's context, and the panel shows and edits it live.
  useScenarioState('page', snapshot.context, (page) => send({ type: 'set', state: page }), PageStateSchema);

  return (
    <SearchPage
      state={snapshot.context}
      dispatch={send}
      onSearch={(searchText) => {
        send({ type: 'search', searchText });
        writeSearch(searchText);
      }}
    />
  );
}
