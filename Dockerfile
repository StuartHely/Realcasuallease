# Stage 1: Build
FROM node:14 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:14 AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm install --only=production

# Set environment variables for PostgreSQL
ENV DATABASE_URL=postgres://user:password@postgres:5432/mydb
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/server.js"]