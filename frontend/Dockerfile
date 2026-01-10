FROM node:18-alpine AS builder
LABEL "language"="nodejs"
LABEL "framework"="react"

WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package.json frontend/yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile || yarn install

# Copy source code from frontend directory
COPY frontend/ .

# Build the app
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config from frontend directory
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
