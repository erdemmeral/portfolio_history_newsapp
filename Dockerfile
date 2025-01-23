FROM node:18-alpine

WORKDIR /app

# Remove npm global update
# RUN npm install -g npm@latest

# Copy root package.json and install root dependencies
COPY package.json .
RUN npm install

# Copy backend and frontend code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Switch back to root
WORKDIR /app

# Expose port
EXPOSE 3000

# Start backend with built frontend
CMD ["node", "backend/server.js"]