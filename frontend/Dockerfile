FROM node:18-bullseye

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY frontend /app

EXPOSE 3000

CMD ["npm", "run", "dev"]
