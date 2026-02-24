FROM node:20-alpine

WORKDIR /workspace

COPY package.json yarn.lock tsconfig.base.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
COPY api ./api

RUN yarn install --frozen-lockfile

EXPOSE 3000

CMD ["npx", "vercel", "dev", "--listen", "0.0.0.0:3000", "apps/bot"]
