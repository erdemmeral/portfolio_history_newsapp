FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Copy entire project
COPY . /app

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Back to backend for running
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Start backend
CMD ["node", "server.js"]