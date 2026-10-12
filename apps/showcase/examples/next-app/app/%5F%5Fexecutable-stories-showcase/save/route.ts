import { createSaveRoute } from 'executable-stories-showcase/next';

// Serves /__executable-stories-showcase/save ("%5F" is "_"), so the panel can save into scenarios/.
// e2e points it outside the folder so tests don't touch the committed scenarios.
export const { GET } = createSaveRoute({ dir: process.env.EXECUTABLE_STORIES_SHOWCASE_SAVE_DIR ?? 'scenarios' });
