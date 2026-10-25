FROM node:20-alpine

WORKDIR /app

# Install all dependencies first so Vite is available for the production build.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the application and create the standalone production frontend.
COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=5173
EXPOSE 5173

# Mount a persistent volume at /data in your hosting dashboard.
# Set USELL_DB_PATH=/data/db.json and USELL_UPLOAD_DIR=/data/uploads.

CMD ["npm", "start"]
