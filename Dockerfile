FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev \
  && npx playwright-chromium install chromium

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libx11-6 libxext6 libxcb1 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /ms-playwright /ms-playwright
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["npm", "start"]
