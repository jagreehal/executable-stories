# Executable Stories docs

Documentation site for executable-stories (Astro + Starlight).

## Local development

- **With base path** (matches production GitHub Pages):  
  `pnpm dev` then open **http://localhost:4321/executable-stories/**

- **From site root** (no base path):  
  `pnpm dev:root` then open **http://localhost:4321/**

## Build

`pnpm build` — output in `dist/`. For GitHub Pages, deploy the contents of `dist/` to a branch or `gh-pages` with the repo configured for the path `/executable-stories`.
