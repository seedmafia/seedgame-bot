# ใช้ Playwright image ที่มี browser dependencies และ binary ครบ
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
