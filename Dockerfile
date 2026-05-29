FROM node:22-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile --no-optional \
	&& pnpm prune --prod \
	&& pnpm store prune \
	&& rm -rf /root/.pnpm-store

COPY app ./app

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app ./app

# CMD ["pnpm", "job:send"]
CMD ["node", "--use-system-ca", "app/scripts/runJob.js", "send"]