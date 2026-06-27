/**
 * Configuration options for ACL and formatters.
 */

/** Options for canonicalizing raw run data */
export interface CanonicalizeOptions {
  /** Attachment handling options */
  attachments?: {
    /** Max bytes before attachment becomes external link. Default: 512KB (524288) */
    maxEmbedBytes?: number;
    /** Directory for external attachments */
    externalDir?: string;
  };

  /** Cucumber compatibility options */
  cucumber?: {
    /** Include trailing space in keywords (e.g., "Given "). Default: true */
    keywordSpacing?: boolean;
    /** Generate deterministic line numbers. Default: true */
    deterministicLines?: boolean;
  };

  /** Default timestamps if not provided in raw data */
  defaults?: {
    /** Default start time (epoch ms). Default: Date.now() */
    startedAtMs?: number;
    /** Default finish time (epoch ms). Default: Date.now() */
    finishedAtMs?: number;
  };
}

