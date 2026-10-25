FROM node:20-alpine

WORKDIR /app

# Install all dependencies first so Vite is available for the production build.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the application and create the standalone production frontend.
COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

# Public deployments use external durable services:
# PostgreSQL via DATABASE_URL and permanent images via Cloudinary.
# No paid persistent disk is required on Render.

CMD ["npm", "start"]
