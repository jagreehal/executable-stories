/**
 * Stable error codes. The class sets the exit code, so scripts and agents can branch on
 * either without reading messages: 1 a scenario failed, 2 configuration, 3 infrastructure.
 */
export const ERROR_CLASSES = {
  // A scenario ran and failed (exit 1).
  SESSION_NOT_STARTED: 'failed',
  SCENARIO_NOT_IN_APP: 'failed',
  READY_TIMEOUT: 'failed',
  UNMOCKED_REQUEST: 'failed',
  PAGE_ERROR: 'failed',
  CONSOLE_ERROR: 'failed',
  ELEMENT_NOT_FOUND: 'failed',
  STEPS_FAILED: 'failed',
  RULE_VIOLATION: 'failed',
  // The command or the scenarios are wrong (exit 2).
  INVALID_ARGUMENT: 'config',
  INVALID_SCENARIO: 'config',
  UNKNOWN_SCENARIO: 'config',
  // Something the command needs is missing or down (exit 3).
  DEV_SERVER_DOWN: 'infra',
  BROWSER_MISSING: 'infra',
  FFMPEG_MISSING: 'infra',
  WORKER_NOT_SERVED: 'infra',
} as const;

export type ErrorCode = keyof typeof ERROR_CLASSES;

export const EXIT_CODES = { failed: 1, config: 2, infra: 3 } as const;

export class CliError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }

  get exitCode() {
    return EXIT_CODES[ERROR_CLASSES[this.code]];
  }
}
