# ---- Stage 1: Build React app ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Serve with nginx ----
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add our custom config
COPY nginx.conf /etc/nginx/conf.d/aidotmd.conf

# Copy built SPA assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
