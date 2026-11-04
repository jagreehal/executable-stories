import { createRequire } from "node:module";

/**
 * The ffmpeg to run: FFMPEG_PATH, then `@ffmpeg-installer/ffmpeg` as `from` resolves it, then PATH.
 * Pass `import.meta.url`, so each package finds its own optional dependency.
 */
export function ffmpegPath(from: string, env: NodeJS.ProcessEnv = process.env): string {
  if (env.FFMPEG_PATH) return env.FFMPEG_PATH;
  try {
    return (createRequire(from)("@ffmpeg-installer/ffmpeg") as { path: string }).path;
  } catch {
    return "ffmpeg";
  }
}
