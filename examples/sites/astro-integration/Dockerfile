# node:22-slim
FROM node:22-slim@sha256:80fdb3f57c815e1b638d221f30a826823467c4a56c8f6a8d7aa091cd9b1675ea

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 9010

USER node
CMD ["npx", "astro", "dev", "--host", "0.0.0.0", "--port", "9010"]
