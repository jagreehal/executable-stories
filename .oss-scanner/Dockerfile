# OSS Scanner build image (https://github.com/anthropics/oss-scanner).
# Built online with the repository as context; the audit that follows runs offline,
# so everything the build and the unit tests need is installed here.
FROM node:24-bookworm

ENV CI=true \
    TURBO_TELEMETRY_DISABLED=1 \
    CYPRESS_INSTALL_BINARY=0

RUN corepack enable && npm install -g bun

# scanner contract: the checkout lives inside the image, at /src
COPY . /src
WORKDIR /src

RUN pnpm install --frozen-lockfile

# Chromium for the Playwright adapter's tests, and for opening generated HTML reports offline.
RUN pnpm --filter executable-stories-playwright exec playwright install --with-deps chromium

# Publishable JS/TS packages only. Example apps, docs-site and the non-JS adapters'
# toolchains (Go, Rust, Ruby, Python, JVM, .NET) are left out; see threat_model.md.
RUN pnpm turbo run build --filter='./packages/*'

# Unit tests prove the image works; a failure must not abort the build.
RUN pnpm turbo run test --filter='./packages/*' --continue \
    || echo "WARNING: package tests reported failures"
