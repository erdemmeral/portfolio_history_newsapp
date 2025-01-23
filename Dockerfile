FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy entire project
COPY . /app

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Back to backend for running
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Start backend
CMD ["node", "server.js"]