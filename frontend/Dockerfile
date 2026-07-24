# Production Dockerfile for DevNova AI Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/public/_redirects /usr/share/nginx/html/_redirects 2>/dev/null || true
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
