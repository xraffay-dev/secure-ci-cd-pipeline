FROM node:20 AS backend-build

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm prune --omit=dev


FROM node:20-alpine AS backend-runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=backend-build /app/package*.json ./
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/index.js ./

EXPOSE 8000

CMD ["node", "index.js"]


FROM node:20 AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM nginx:1.27-alpine AS frontend-runtime

COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
