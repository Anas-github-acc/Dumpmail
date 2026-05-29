FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile -ignore-scripts=false

COPY app ./app

# CMD ["pnpm", "job:send"]
CMD ["node", "--use-system-ca", "app/scripts/runJob.js", "send"]