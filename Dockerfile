FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20 AS server-build
WORKDIR /app/backend
COPY ./backend/package*.json ./
RUN npm ci
COPY ./backend .
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk upgrade --no-cache \
	&& rm -rf /usr/local/lib/node_modules/npm \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=server-build /app/backend/package*.json ./
COPY --from=server-build /app/backend/node_modules ./node_modules
COPY --from=server-build /app/backend/index.js ./
COPY --from=frontend-build /app/frontend/dist ./client/dist

EXPOSE 8000

CMD ["node", "index.js"]