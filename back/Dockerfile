FROM node:20-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "node scripts/wait-for-db.js && npx nodemon --legacy-watch --ignore uploads --ignore db --ignore scripts server.js"]
