require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { client, getDisplayName } = require('./line');
const fs = require('fs');
const path = require('path');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
const QUEUE_FILE = 'queue.json';

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

// serve static files from public directory
app.use('/qr', express.static(path.join(__dirname, 'public/qr')));

app.post('/webhook', line.middleware(config), express.json(), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text;
      const userId = event.source.userId;
      const name = await getDisplayName(userId);

      if (!name.includes('✅')) {
        await client.pushMessage(userId, { type: 'text', text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..' });
        continue;
      }

      if (text === 'เติมเงิน' || text.toLowerCase() === 'topup') {
        await client.pushMessage(userId, {
          type: 'text',
          text: `เลือกจำนวนเงินที่ต้องการเติมค่ะ:
- 100 บาท ได้ 1,100 points
- 500 บาท ได้ 5,500 points
- 1,000 บาท ได้ 11,000 points
- 3,000 บาท ได้ 33,000 points
- 10,000 บาท ได้ 113,000 points

หรือพิมพ์จำนวนเองได้ เช่น 920`
        });
      } else if (/^\d+$/.test(text)) {
        fs.writeFileSync(`amount-${userId}.txt`, text);
        await client.pushMessage(userId, { type: 'text', text: 'กรุณาส่ง AID ของคุณ (25 หลัก)' });
      } else if (text.length === 25) {
        const amountPath = `amount-${userId}.txt`;
        if (fs.existsSync(amountPath)) {
          const amount = parseInt(fs.readFileSync(amountPath, 'utf-8'));
          const queue = loadQueue();
          queue.push({ userId, aid: text, amount });
          saveQueue(queue);
          fs.unlinkSync(amountPath);
          await client.pushMessage(userId, {
            type: 'text',
            text: `รับคำสั่งเติมเงินเรียบร้อยแล้วค่ะ คุณอยู่ในลำดับที่ ${queue.length}`
          });
        }
      } else {
        await client.pushMessage(userId, {
          type: 'text',
          text: `กรุณาพิมพ์ "เติมเงิน" หรือ "topup" เพื่อเริ่มต้นใช้งานค่ะ`
        });
      }
    }
  }

  return res.status(200).send('OK');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server เริ่มที่พอร์ต ${port}`);
});