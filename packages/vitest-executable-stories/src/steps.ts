/**
 * Module-level BDD step functions for use inside story() callbacks.
 *
 * This module provides a `steps` object with given/when/then/and/doc
 * that can be destructured and used without receiving them from the callback.
 *
 * @example
 * import { story } from "vitest-executable-stories";
 * import { steps } from "vitest-executable-stories/steps";
 * const { given, when, then } = steps;
 *
 * story("Calculator adds two numbers", () => {
 *   given("two numbers 5 and 3", () => { ... });
 *   when("the numbers are added", () => { ... });
 *   then("the result is 8", () => { ... });
 * });
 *
 * @module
 */

import { _getStoryApi, docStoryOverload, type StepFn, type DocApi } from "./bdd.js";

// Create step functions that delegate to the current story's API
function createGiven(): StepFn {
  const fn = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().given(text, impl);
  fn.skip = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().given.skip(text, impl);
  fn.only = (text: string, impl: () => void | Promise<void>) => _getStoryApi().given.only(text, impl);
  fn.todo = (text: string) => _getStoryApi().given.todo(text);
  fn.fails = (text: string, impl: () => void | Promise<void>) => _getStoryApi().given.fails(text, impl);
  fn.concurrent = (text: string, impl: () => void | Promise<void>) => _getStoryApi().given.concurrent(text, impl);
  return fn;
}

function createWhen(): StepFn {
  const fn = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().when(text, impl);
  fn.skip = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().when.skip(text, impl);
  fn.only = (text: string, impl: () => void | Promise<void>) => _getStoryApi().when.only(text, impl);
  fn.todo = (text: string) => _getStoryApi().when.todo(text);
  fn.fails = (text: string, impl: () => void | Promise<void>) => _getStoryApi().when.fails(text, impl);
  fn.concurrent = (text: string, impl: () => void | Promise<void>) => _getStoryApi().when.concurrent(text, impl);
  return fn;
}

function createThen(): StepFn {
  function thenStep(this: unknown, text: unknown, impl?: unknown) {
    if (typeof text === "function" && typeof impl === "function") {
      const resolve = text as (value: unknown) => void;
      const reject = impl as (reason?: unknown) => void;
      try {
        const namespace = this as Record<string, unknown> | null | undefined;
        const resolved: Record<string, unknown> = {};
        if (namespace && typeof namespace === "object") {
          for (const key of Object.keys(namespace)) {
            if (key === "then") continue;
            resolved[key] = namespace[key];
          }
        }
        resolve(resolved);
      } catch (error) {
        reject(error);
      }
      return;
    }
    return _getStoryApi().then(text as string, impl as (() => void | Promise<void>) | undefined);
  }
  const fn = thenStep as StepFn;
  fn.skip = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().then.skip(text, impl);
  fn.only = (text: string, impl: () => void | Promise<void>) => _getStoryApi().then.only(text, impl);
  fn.todo = (text: string) => _getStoryApi().then.todo(text);
  fn.fails = (text: string, impl: () => void | Promise<void>) => _getStoryApi().then.fails(text, impl);
  fn.concurrent = (text: string, impl: () => void | Promise<void>) => _getStoryApi().then.concurrent(text, impl);
  return fn;
}

function createAnd(): StepFn {
  const fn = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().and(text, impl);
  fn.skip = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().and.skip(text, impl);
  fn.only = (text: string, impl: () => void | Promise<void>) => _getStoryApi().and.only(text, impl);
  fn.todo = (text: string) => _getStoryApi().and.todo(text);
  fn.fails = (text: string, impl: () => void | Promise<void>) => _getStoryApi().and.fails(text, impl);
  fn.concurrent = (text: string, impl: () => void | Promise<void>) => _getStoryApi().and.concurrent(text, impl);
  return fn;
}

function createBut(): StepFn {
  const fn = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().but(text, impl);
  fn.skip = (text: string, impl?: () => void | Promise<void>) => _getStoryApi().but.skip(text, impl);
  fn.only = (text: string, impl: () => void | Promise<void>) => _getStoryApi().but.only(text, impl);
  fn.todo = (text: string) => _getStoryApi().but.todo(text);
  fn.fails = (text: string, impl: () => void | Promise<void>) => _getStoryApi().but.fails(text, impl);
  fn.concurrent = (text: string, impl: () => void | Promise<void>) => _getStoryApi().but.concurrent(text, impl);
  return fn;
}

function createDoc(): DocApi {
  return new Proxy({} as DocApi, {
    get(_, prop: keyof DocApi) {
      if (prop === "story") return docStoryOverload;
      return (_getStoryApi().doc as unknown as Record<string, unknown>)[prop];
    },
  });
}

/**
 * BDD step functions for use inside story() callbacks.
 * Destructure at the top of your test file:
 *
 * @example
 * import { story } from "vitest-executable-stories";
 * import { steps } from "vitest-executable-stories/steps";
 * const { given, when, then } = steps;
 *
 * story("Calculator adds two numbers", () => {
 *   given("two numbers 5 and 3", () => { ... });
 *   when("the numbers are added", () => { ... });
 *   then("the result is 8", () => { ... });
 * });
 */
export const given = createGiven();
export const when = createWhen();
const then = createThen();
export const and = createAnd();
export const but = createBut();

export const arrange = createGiven();
export const act = createWhen();
export const assert = then;

export const setup = createGiven();
export const context = createGiven();
export const execute = createWhen();
export const action = createWhen();
export const verify = then;

export const doc = createDoc();

export const steps = {
  given,
  when,
  then,
  and,
  but,
  arrange,
  act,
  assert,
  setup,
  context,
  execute,
  action,
  verify,
  doc,
};

export const step = steps;
