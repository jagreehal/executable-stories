/**
 * Shell completion scripts. Emitted to stdout so users can eval or redirect:
 *
 *   executable-stories completion zsh  > ~/.zsh/completions/_executable-stories
 *   eval "$(executable-stories completion bash)"
 *
 * The subcommand and flag lists live here rather than being scraped from the
 * help text: a completion that silently drifts is worse than none, so this file
 * is the one place to update when a command is added, and its test asserts the
 * script mentions every subcommand the CLI dispatches.
 */

/** Every subcommand the CLI dispatches, with the one-line description. */
export const COMPLETION_SUBCOMMANDS: Array<[string, string]> = [
  ["format", "Read raw test results and generate reports"],
  ["watch", "Regenerate reports whenever the raw-run file changes"],
  ["compare", "Compare two runs and generate a diff report"],
  ["gate-release", "Verify a release candidate against the dev baseline"],
  ["review", "Generate an Evidence Review of AI-authored changes"],
  ["list", "List scenarios from a test run"],
  ["check", "Backpressure summary: compress passing, expand failing"],
  ["check-explainers", "Audit explainer docs against a run"],
  ["goal", "Behavioral definition-of-done for agent loops"],
  ["triage", "Discovery worklist: failing scenarios, regressions first"],
  ["validate", "Validate a JSON file against the schema"],
  ["doctor", "Diagnose the run JSON: location, schema version, contents"],
  ["dev", "Run the Astro docs site dev server"],
  ["init-astro", "Scaffold a thin Astro docs site"],
  ["new", "Scaffold a docs page from a template"],
  ["check-links", "Scan docs for broken links"],
  ["import-openapi", "Generate API doc pages from an OpenAPI spec"],
  ["publish-confluence", "Publish an ADF JSON file to Confluence"],
  ["publish-jira", "Publish an ADF JSON file to a Jira issue"],
  ["deploy", "Record deployments, show status, detect drift"],
  ["completion", "Output a shell completion script"],
];

/** Flags worth completing (the long tail of gate flags is intentionally omitted). */
const COMMON_FLAGS = [
  "--format",
  "--preset",
  "--config",
  "--input-type",
  "--output-dir",
  "--output-name",
  "--stdin",
  "--open",
  "--minify",
  "--list-format",
  "--check-format",
  "--baseline",
  "--baseline-dir",
  "--emit-canonical",
  "--help",
];

/** Values for flags with a closed set, so completion suggests real options. */
const FLAG_VALUES: Record<string, string[]> = {
  "--format": [
    "html",
    "markdown",
    "astro-markdown",
    "junit",
    "cucumber-json",
    "cucumber-html",
    "cucumber-messages",
    "confluence",
    "story-report-json",
    "scenario-index-json",
    "behavior-manifest-json",
    "release-manifest",
    "traceability-matrix",
    "traceability-csv",
  ],
  "--preset": ["agent", "ci", "docs"],
  "--input-type": ["raw", "canonical", "ndjson"],
  "--list-format": ["text", "json", "csv", "markdown-table"],
  "--check-format": ["text", "json"],
};

export type CompletionShell = "bash" | "zsh" | "fish";

function bashScript(): string {
  const subcommands = COMPLETION_SUBCOMMANDS.map(([name]) => name).join(" ");
  const flags = COMMON_FLAGS.join(" ");
  const valueCases = Object.entries(FLAG_VALUES)
    .map(([flag, values]) => `    ${flag})\n      COMPREPLY=( $(compgen -W "${values.join(" ")}" -- "$cur") ); return 0 ;;`)
    .join("\n");
  return `# executable-stories bash completion
_executable_stories() {
  local cur prev
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  case "$prev" in
${valueCases}
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") ); return 0 ;;
  esac

  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${subcommands}" -- "$cur") ); return 0
  fi

  if [[ "$cur" == -* ]]; then
    COMPREPLY=( $(compgen -W "${flags}" -- "$cur") ); return 0
  fi

  COMPREPLY=( $(compgen -f -- "$cur") )
}
complete -F _executable_stories executable-stories
`;
}

function zshScript(): string {
  const subcommands = COMPLETION_SUBCOMMANDS.map(([name, desc]) => `    '${name}:${desc.replaceAll("'", "")}'`).join(
    "\n",
  );
  const valueCases = Object.entries(FLAG_VALUES)
    .map(([flag, values]) => `    ${flag})\n      _values '${flag.slice(2)}' ${values.join(" ")} ;;`)
    .join("\n");
  return `#compdef executable-stories
# executable-stories zsh completion

_executable_stories() {
  local -a subcommands
  subcommands=(
${subcommands}
  )

  case "\${words[CURRENT-1]}" in
${valueCases}
    completion)
      _values 'shell' bash zsh fish ;;
    *)
      if (( CURRENT == 2 )); then
        _describe 'subcommand' subcommands
      else
        _arguments '*:file:_files' \\
          '--format[output formats]' \\
          '--preset[format preset: agent, ci, docs]' \\
          '--output-dir[output directory]:directory:_files -/' \\
          '--output-name[base filename]' \\
          '--open[open the HTML report when done]' \\
          '--stdin[read JSON from stdin]' \\
          '--help[show help]'
      fi ;;
  esac
}

_executable_stories "$@"
`;
}

function fishScript(): string {
  const lines = COMPLETION_SUBCOMMANDS.map(
    ([name, desc]) =>
      `complete -c executable-stories -n __fish_use_subcommand -a ${name} -d '${desc.replaceAll("'", "")}'`,
  );
  for (const [flag, values] of Object.entries(FLAG_VALUES)) {
    lines.push(
      `complete -c executable-stories -l ${flag.slice(2)} -x -a '${values.join(" ")}'`,
    );
  }
  lines.push("complete -c executable-stories -l open -d 'Open the HTML report when done'");
  lines.push("complete -c executable-stories -l help -d 'Show help'");
  return `# executable-stories fish completion\n${lines.join("\n")}\n`;
}

/** Build the completion script for a shell. */
export function completionScript(shell: CompletionShell): string {
  switch (shell) {
    case "bash":
      return bashScript();
    case "zsh":
      return zshScript();
    case "fish":
      return fishScript();
  }
}

/** Run the `completion` subcommand. Returns a process exit code. */
export function runCompletion(args: string[]): number {
  const shell = args[0];
  if (!shell || shell === "--help" || shell === "-h") {
    console.error(
      "Usage: executable-stories completion <bash|zsh|fish>\n\n" +
        "  bash:  eval \"$(executable-stories completion bash)\"\n" +
        "  zsh:   executable-stories completion zsh > ~/.zsh/completions/_executable-stories\n" +
        "  fish:  executable-stories completion fish > ~/.config/fish/completions/executable-stories.fish",
    );
    return shell ? 0 : 2;
  }
  if (shell !== "bash" && shell !== "zsh" && shell !== "fish") {
    console.error(`Error: unsupported shell "${shell}". Use bash, zsh, or fish.`);
    return 2;
  }
  console.log(completionScript(shell));
  return 0;
}
