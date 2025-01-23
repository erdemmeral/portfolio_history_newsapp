FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with npm install (instead of ci)
RUN npm install

# Copy entire project
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Back to root
WORKDIR /app

# Expose port
EXPOSE 3000

# Start backend
CMD ["node", "backend/server.js"]