FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm install

COPY . .

# Now build TypeScript
RUN npm run build

EXPOSE 5000

# Start the compiled app
CMD ["npm", "run", "dev"]