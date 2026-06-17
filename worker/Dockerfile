FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
    && corepack prepare pnpm@10.30.3 --activate \
    && pnpm install --frozen-lockfile --prod

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/index.js"]
