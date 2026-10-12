import { LocationProvider, Route, Router } from 'preact-iso';
import { ReducerPage } from './routes/ReducerPage';
import { XStatePage } from './routes/XStatePage';

export function App() {
  return (
    <LocationProvider>
      <Router>
        <Route path='/' component={ReducerPage} />
        <Route path='/xstate' component={XStatePage} />
        <Route default component={ReducerPage} />
      </Router>
    </LocationProvider>
  );
}
