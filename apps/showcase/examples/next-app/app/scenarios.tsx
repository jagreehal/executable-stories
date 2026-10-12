'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { ScenarioSchema, startScenarios } from 'executable-stories-showcase';
import { cookiesAdapter } from 'executable-stories-showcase/cookies';
import { mountPanel } from 'executable-stories-showcase/panel';
import admin from '../scenarios/admin.json';
import greetingError from '../scenarios/greeting-error.json';

// Imported JSON widens literals ("GET" becomes string): parse it into a typed scenario.
const scenarios = [admin, greetingError].map((s) => ScenarioSchema.parse(s));

const dev = process.env.NODE_ENV === 'development';

let started: Promise<void> | undefined; // Strict Mode runs effects twice

// Holds the app back until the session starts, so client fetches hit the scenario's mocks.
export function Scenarios({ children }: { children: ReactNode; }) {
  const [ready, setReady] = useState(!dev);

  useEffect(() => {
    if (!dev) return;
    started ??= startScenarios({ scenarios, adapters: [cookiesAdapter()] }).then(
      (s) => {
        mountPanel(s);
      },
    );
    void started.then(() => setReady(true));
  }, []);

  return ready ? children : null;
}
