FROM node:20-alpine

WORKDIR /workspace

COPY package.json yarn.lock tsconfig.base.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN yarn install --frozen-lockfile

EXPOSE 3001

CMD ["yarn", "workspace", "@event/admin", "dev", "-p", "3001"]
