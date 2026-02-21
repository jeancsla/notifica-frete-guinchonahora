FROM oven/bun:1.2.23-alpine
WORKDIR /app

COPY apps/api/package.json /app/package.json
RUN bun install --frozen-lockfile || bun install

COPY apps/api/src /app/src
COPY infra/migrations /app/infra/migrations

ENV NODE_ENV=production
EXPOSE 4000
CMD ["bun", "src/index.ts"]
