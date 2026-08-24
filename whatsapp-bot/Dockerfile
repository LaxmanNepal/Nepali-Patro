FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY bot.js ./
RUN mkdir -p /app/auth /app/data
ENV NODE_ENV=production
CMD ["node", "bot.js"]
