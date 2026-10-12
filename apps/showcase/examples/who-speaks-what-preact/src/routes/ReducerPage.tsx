import { useReducer } from 'preact/hooks';
import { useScenarioState } from 'executable-stories-showcase-react';
import { SearchPage } from '../components/SearchPage';
import { initialPageState, pageReducer } from '../page';
import { PageStateSchema } from '../schema';
import { readSearch, writeSearch } from './search';

/** Page state in a plain useReducer. */
export function ReducerPage() {
  const [state, dispatch] = useReducer(pageReducer, initialPageState, (initial) => {
    const searchText = readSearch();

    return searchText ? pageReducer(initial, { type: 'search', searchText }) : initial;
  });

  // Scenarios set this state, and the panel shows and edits it live.
  useScenarioState('page', state, (page) => dispatch({ type: 'set', state: page }), PageStateSchema);

  return (
    <SearchPage
      state={state}
      dispatch={dispatch}
      onSearch={(searchText) => {
        dispatch({ type: 'search', searchText });
        writeSearch(searchText);
      }}
    />
  );
}
