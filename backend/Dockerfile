FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl
COPY package.json yarn.lock* ./
RUN yarn install --ignore-engines
COPY . .
RUN npx prisma generate
RUN yarn build

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["sh", "-c", "npx prisma generate && node dist/main.js"]

