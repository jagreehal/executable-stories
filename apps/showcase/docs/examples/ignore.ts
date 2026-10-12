import { type ScenarioInput, startScenarios } from 'executable-stories-showcase';

declare const scenarios: ScenarioInput[];

await startScenarios({
  scenarios,
  allow: ['images.example-cdn.com'], // reaches the real network, even in strict mode
  ignore: [/posthog|segment|sentry|google-analytics|googletagmanager|recaptcha|hcaptcha|intercom/i],
});
