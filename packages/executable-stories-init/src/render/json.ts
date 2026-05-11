import type { Plan, Result } from '../types';

export function renderJson(args: { plan: Plan; result: Result }): string {
  return JSON.stringify({ ok: args.result.ok, plan: args.plan, result: args.result }, null, 2);
}
