FROM mcr.microsoft.com/devcontainers/universal:2

# Remove stale yarn repo (expired GPG key in base image)
RUN rm -f /etc/apt/sources.list.d/yarn.list

# JDK 21 + Maven for JUnit 5 adapter dev; curl/ca-certs for Bun install
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl bash \
     openjdk-21-jdk maven \
  && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Install Rust (stable) system-wide
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
  | sh -s -- -y --default-toolchain stable --profile minimal

# Install Bun globally (for bun build --compile)
ENV BUN_INSTALL=/usr/local/bun
RUN curl -fsSL https://bun.sh/install | bash \
  && ln -s /usr/local/bun/bin/bun /usr/local/bin/bun
