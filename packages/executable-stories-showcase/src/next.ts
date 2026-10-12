import { relative, resolve } from 'node:path';
import { startSaveServer } from './save.js';

export interface SaveRouteOptions {
  /** Folder the panel's "Save to project" writes into, relative to the project root. Default "src/scenarios". */
  dir?: string;
}

declare global {
  /** One save server per folder for the life of the dev process, across route reloads. */
  var executableStoriesShowcaseSaveServers: Map<string, Promise<string>> | undefined;
}

/**
 * The route handler behind the panel's "Save to project" in Next.js (App Router). Put it at
 * `app/%5F%5Fexecutable-stories-showcase/save/route.ts` (`%5F` is an underscore; a plain `_` folder is
 * private and never routes):
 *
 *     export const { GET } = createSaveRoute({ dir: 'scenarios' });
 *
 * `next dev` listens on the network, so this route only tells the panel where to save: a
 * server on 127.0.0.1 that other machines can't reach. Outside `next dev` it answers 404.
 */
export function createSaveRoute({ dir = 'src/scenarios' }: SaveRouteOptions = {}) {
  const GET = async (request: Request): Promise<Response> => {
    if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });

    const root = process.cwd();
    const target = resolve(root, dir);
    const port = process.env.PORT ?? new URL(request.url).port;
    const origins = ['localhost', '127.0.0.1', '[::1]'].map((host) => `http://${host}:${port}`);

    const servers = (globalThis.executableStoriesShowcaseSaveServers ??= new Map());
    let url = servers.get(target);

    if (!url) {
      url = startSaveServer({ dir: target, root, origins });
      servers.set(target, url);
      // A failed start (port exhaustion, say) retries on the next request.
      url.catch(() => servers.delete(target));
    }

    return Response.json({ dir: relative(root, target).replaceAll('\\', '/'), url: await url });
  };

  return { GET };
}
