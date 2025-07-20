FROM oven/bun:1 AS builder

WORKDIR /app
COPY . .
RUN bun install
RUN bun run build --ignore-ts-errors




FROM oven/bun:1 AS runner

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build        ./build
COPY --from=builder /app/ace.js        ./ace.js
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
EXPOSE 3333
CMD ["node", "ace.js", "serve", "--production", "--host", "0.0.0.0", "--port", "3333"]
