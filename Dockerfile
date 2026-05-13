
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run db:generate --prefix server

# Build client and server
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
