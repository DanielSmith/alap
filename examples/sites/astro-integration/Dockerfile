FROM node:22-slim

WORKDIR /app

COPY package.json ./
# Override the pinned Astro 5 with Astro 6 for Node 22 environments
RUN sed -i 's/"astro": "~5.9.0"/"astro": "^6.0.0"/' package.json \
    && npm install

COPY . .

EXPOSE 9010

CMD ["npx", "astro", "dev", "--host", "0.0.0.0", "--port", "9010"]
