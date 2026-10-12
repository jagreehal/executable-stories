import { z } from 'zod';
import { deepMerge } from '../catalog.js';
import type { TypedAdapter } from '../runtime.js';
import { JsonSchema } from '../schema.js';

/** XState's state value: "loading", or { "checkout": "payment" } for nested states. */
type StateValue = string | { [state: string]: StateValue; };

const StateValueSchema: z.ZodType<StateValue> = z.lazy(() =>
  z.union([z.string(), z.record(z.string(), StateValueSchema)])
);

export const xstateState = z.object({
  value: StateValueSchema,
  /** Merged over the machine's initial context, then decoded with the context schema. */
  context: z.record(z.string(), JsonSchema).optional(),
});

type MachineState = z.output<typeof xstateState>;

interface Machine<Context, Snapshot> {
  config: { context?: unknown; };
  resolveState(config: { value: StateValue; context: Context; }): Snapshot;
}

/**
 * Resolves `state.xstate` into a snapshot. Start your actor from it:
 * `createActor(machine, { snapshot: adapter.snapshot })`.
 */
export function xstateAdapter<Context, Snapshot>(
  machine: Machine<Context, Snapshot>,
  { key = 'xstate', context: contextSchema }: { key?: string; context: z.ZodType<Context>; },
) {
  const adapter: TypedAdapter<MachineState> & { snapshot?: Snapshot; } = {
    key,
    schema: xstateState,
    // The actor starts from the snapshot once, so a new one needs a reload.
    inPlace: false,
    apply({ value, context }) {
      // Context factories can't be merged into; only a plain JSON context is.
      const initial = JsonSchema.safeParse(machine.config.context ?? {});
      const merged = deepMerge(initial.success ? initial.data : {}, context ?? {});
      adapter.snapshot = machine.resolveState({ value, context: contextSchema.parse(merged) });
    },
  };

  return adapter;
}
