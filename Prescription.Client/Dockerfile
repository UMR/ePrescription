# Stage 1: Build the Angular application
FROM node:20 AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to avoid conflicts
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the Angular app for production
# Use NODE_OPTIONS to increase memory and avoid potential issues
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npx ng build --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from build stage
# Angular 19 outputs to dist/<project>/browser
COPY --from=build /app/dist/prescription.client/browser .

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
