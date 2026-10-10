FROM public.ecr.aws/docker/library/node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl
COPY package.json yarn.lock* ./
RUN yarn install --ignore-engines
COPY . .
RUN npx prisma generate
RUN yarn build

FROM public.ecr.aws/docker/library/node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl xvfb
RUN npx playwright install --with-deps chromium
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3001
# Run with xvfb for headful playwright
CMD ["sh", "-c", "npx prisma generate && xvfb-run -a node dist/main.js"]
