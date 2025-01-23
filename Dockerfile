FROM node:18-alpine

# Use non-root user
USER node
WORKDIR /home/node/app

# Copy only necessary files
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy project files
COPY --chown=node:node backend ./backend
COPY --chown=node:node frontend ./frontend

# Build frontend
WORKDIR /home/node/app/frontend
RUN npm ci
RUN npm run build

# Back to root
WORKDIR /home/node/app

# Expose port
EXPOSE 3000

# Start backend
CMD ["node", "backend/server.js"]