/**
 * Provider registry.
 *
 * Adding a provider is one file next to this one plus one entry in the map
 * below. No dynamic import: the CLI ships as a Bun single binary, which cannot
 * see modules resolved at runtime, so adapters are in-tree by design.
 *
 * Credentials come from the environment only, never from the config file, so a
 * config can be committed without leaking anything.
 */

import type { AdapterDeps, SyncProvider } from "../port";
import type { SyncEngineConfig } from "../engine";
import { createTestRailProvider, type TestRailConfig } from "./testrail";
import { createXrayProvider, type XrayConfig } from "./xray";

export type ProviderName = "testrail" | "xray";

/** Per-provider config as it appears under `sync` in executable-stories.config.mjs. */
export interface SyncTargets {
  testrail?: TestRailConfig & Partial<SyncEngineConfig>;
  xray?: XrayConfig & Partial<SyncEngineConfig>;
}

export interface BuiltProvider {
  provider: SyncProvider;
  /** Engine defaults this provider implies, overridable per target in config. */
  engineDefaults: SyncEngineConfig;
}

export const PROVIDER_NAMES: ProviderName[] = ["testrail", "xray"];

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_NAMES as string[]).includes(value);
}

function required(env: Record<string, string | undefined>, name: string, hint: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing ${name}. ${hint}`);
  return value;
}

export function buildProvider(
  args: { name: ProviderName; targets: SyncTargets; env: Record<string, string | undefined> },
  deps: AdapterDeps,
): BuiltProvider {
  const { name, targets, env } = args;

  if (name === "testrail") {
    const config = targets.testrail;
    if (!config) {
      throw new Error(
        'No TestRail config found. Add a `sync: { testrail: { url, projectId } }` block to executable-stories.config.mjs, or run "executable-stories sync testrail --init".',
      );
    }
    const provider = createTestRailProvider(
      config,
      {
        username: required(env, "TESTRAIL_USERNAME", "This is the login email of the TestRail account."),
        apiKey: required(
          env,
          "TESTRAIL_API_KEY",
          "Generate one in TestRail under My Settings -> API Keys. A password will not work when the instance requires API keys.",
        ),
      },
      deps,
    );
    return {
      provider,
      // TestRail ids are numeric and conventionally written "C1234" in a ticket,
      // so the prefix is decoration and gets stripped.
      engineDefaults: { ticketPrefix: "C", ticketPrefixStrip: true },
    };
  }

  const config = targets.xray;
  if (!config) {
    throw new Error(
      'No Xray config found. Add a `sync: { xray: { jiraBaseUrl, projectKey } }` block to executable-stories.config.mjs, or run "executable-stories sync xray --init".',
    );
  }
  const provider = createXrayProvider(
    config,
    {
      clientId: required(env, "XRAY_CLIENT_ID", "Create an API key pair in Jira under Apps -> Xray -> API Keys."),
      clientSecret: required(env, "XRAY_CLIENT_SECRET", "This is the secret half of the Xray API key pair."),
      jiraEmail: env["JIRA_EMAIL"],
      jiraToken: env["JIRA_TOKEN"],
    },
    deps,
  );
  return {
    provider,
    // An Xray case id is a Jira issue key, so the project prefix is part of the
    // id and must survive.
    engineDefaults: { ticketPrefix: `${config.projectKey}-`, ticketPrefixStrip: false },
  };
}
