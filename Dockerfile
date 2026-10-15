# TripPlanner — one container for the React app + the API (Part 18).
# Optional: Render deploys with render.yaml and does not need this file. Use it for any Docker host:
#   docker build -t tripplanner .
#   docker run -p 5000:5000 -e MONGODB_URI="mongodb+srv://..." -e JWT_SECRET="$(openssl rand -base64 48)" -e CLIENT_URL=http://localhost:5000 tripplanner
#   Step by step: docs/DEPLOY.md
ARG NODE_IMAGE=node:22-alpine

# 1) Build the React app (needs the dev tools: Vite, Tailwind).
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --no-audit --no-fund
COPY shared shared
COPY client client
RUN npm run build

# 2) The image that runs: production packages only, the server code and the built app.
FROM ${NODE_IMAGE}
ENV NODE_ENV=production PORT=5000
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY shared shared
COPY server server
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/src/server.js"]
