# ใช้ base image ที่ Playwright แนะนำ (มี deps ครบ)
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# ทำงานในโฟลเดอร์ /app
WORKDIR /app

# คัดลอกไฟล์ทั้งหมดเข้าไป
COPY . .

# ติดตั้ง npm dependencies
RUN npm install

# Port ที่รอรับ webhook (ถ้ามี)
EXPOSE 3000

# Start command
CMD ["npm", "start"]
