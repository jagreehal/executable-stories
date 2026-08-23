/**
 * Node-only store for story meta sent from the browser via cy.task.
 * Plugin writes; reporter reads. Keyed by spec + titlePath for merging with run results.
 */

import type { StoryMeta, ScopedAttachment, RecordMetaPayload, FeatureInput } from "./types";

export interface StoredMeta {
  specRelative: string;
  titlePath: string[];
  meta: StoryMeta;
  attachments?: ScopedAttachment[];
}

function key(specRelative: string, titlePath: string[]): string {
  return `${specRelative}\0${titlePath.join("\0")}`;
}

const store = new Map<string, StoredMeta>();
const features = new Map<string, FeatureInput>();

export function recordMeta(payload: RecordMetaPayload): null {
  store.set(key(payload.specRelative, payload.titlePath), {
    specRelative: payload.specRelative,
    titlePath: payload.titlePath,
    meta: payload.meta,
    attachments: payload.attachments,
  });
  if (payload.feature?.title) features.set(payload.specRelative, payload.feature);
  return null;
}

/** The feature declared by a spec, if it declared one. */
export function getFeature(specRelative: string): FeatureInput | undefined {
  return features.get(specRelative);
}

export function getAttachments(specRelative: string, titlePath: string[]): ScopedAttachment[] | undefined {
  return store.get(key(specRelative, titlePath))?.attachments;
}

export function getMeta(specRelative: string, titlePath: string[]): StoryMeta | undefined {
  return store.get(key(specRelative, titlePath))?.meta;
}

export function getAllMeta(): StoredMeta[] {
  return Array.from(store.values());
}

export function clearStore(): void {
  store.clear();
  features.clear();
}
