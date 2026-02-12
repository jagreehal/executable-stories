/**
 * Attachment resolution: embed vs link decision.
 *
 * Attachments can either be embedded inline (base64) or linked to
 * external files based on size thresholds.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { RawAttachment } from "../../types/raw";
import type { Attachment } from "../../types/test-result";

/** Default max embed size: 512KB */
const DEFAULT_MAX_EMBED_BYTES = 512 * 1024;

/** Options for attachment resolution */
export interface AttachmentOptions {
  /** Max bytes before attachment becomes external link. Default: 512KB */
  maxEmbedBytes?: number;
  /** Directory for external attachments */
  externalDir?: string;
  /** Project root for relative paths */
  projectRoot?: string;
}

/**
 * Resolve a raw attachment to a canonical attachment.
 *
 * Decision logic:
 * 1. If body is already provided, use it (check size for encoding decision)
 * 2. If path is provided, read file and decide embed vs link
 * 3. For large files, return a URL reference instead of embedding
 *
 * @param raw - Raw attachment from framework
 * @param options - Resolution options
 * @returns Resolved canonical attachment
 */
export function resolveAttachment(
  raw: RawAttachment,
  options: AttachmentOptions = {}
): Attachment {
  const maxBytes = options.maxEmbedBytes ?? DEFAULT_MAX_EMBED_BYTES;

  // If we already have a body, use it
  if (raw.body) {
    return {
      name: raw.name,
      mediaType: raw.mediaType,
      body: raw.body,
      contentEncoding: raw.encoding ?? "BASE64",
    };
  }

  // If we have a path, read and potentially embed
  if (raw.path) {
    return resolveFromPath(raw, maxBytes, options);
  }

  // No body or path - return empty attachment
  return {
    name: raw.name,
    mediaType: raw.mediaType,
    body: "",
    contentEncoding: "IDENTITY",
  };
}

/**
 * Resolve attachment from file path.
 */
function resolveFromPath(
  raw: RawAttachment,
  maxBytes: number,
  options: AttachmentOptions
): Attachment {
  const filePath = raw.path!;
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(options.projectRoot ?? process.cwd(), filePath);

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    // File doesn't exist - return path as URL reference
    return {
      name: raw.name,
      mediaType: raw.mediaType,
      body: filePath,
      contentEncoding: "IDENTITY",
    };
  }

  // Get file size
  const stats = fs.statSync(absolutePath);
  const byteLength = raw.byteLength ?? stats.size;

  // If too large, return as URL reference
  if (byteLength > maxBytes) {
    // Copy to external dir if specified
    if (options.externalDir) {
      const destPath = copyToExternalDir(absolutePath, options.externalDir);
      return {
        name: raw.name,
        mediaType: raw.mediaType,
        body: destPath,
        contentEncoding: "IDENTITY",
      };
    }

    // Return relative path as URL
    const relativePath = options.projectRoot
      ? path.relative(options.projectRoot, absolutePath)
      : filePath;

    return {
      name: raw.name,
      mediaType: raw.mediaType,
      body: relativePath,
      contentEncoding: "IDENTITY",
    };
  }

  // Embed as base64
  const content = fs.readFileSync(absolutePath);
  return {
    name: raw.name,
    mediaType: raw.mediaType,
    body: content.toString("base64"),
    contentEncoding: "BASE64",
  };
}

/**
 * Copy file to external directory and return the destination path.
 */
function copyToExternalDir(sourcePath: string, externalDir: string): string {
  // Ensure external dir exists
  if (!fs.existsSync(externalDir)) {
    fs.mkdirSync(externalDir, { recursive: true });
  }

  const filename = path.basename(sourcePath);
  const destPath = path.join(externalDir, filename);

  // Handle filename conflicts
  let finalPath = destPath;
  let counter = 1;
  while (fs.existsSync(finalPath)) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    finalPath = path.join(externalDir, `${base}-${counter}${ext}`);
    counter++;
  }

  fs.copyFileSync(sourcePath, finalPath);
  return finalPath;
}

/**
 * Resolve multiple attachments.
 *
 * @param attachments - Raw attachments array
 * @param options - Resolution options
 * @returns Resolved canonical attachments
 */
export function resolveAttachments(
  attachments: RawAttachment[] | undefined,
  options: AttachmentOptions = {}
): Attachment[] {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  return attachments.map((raw) => resolveAttachment(raw, options));
}
