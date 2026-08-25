FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

ENV PORT=3004

RUN mkdir -p /app/data

COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3004

CMD ["/start.sh"]
