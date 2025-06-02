require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { getDisplayName, client } = require('./line');

const app = express();
const port = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

app.use('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.status(200).end();
  }

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const msg = event.message.text.trim().toLowerCase();

      if (msg === 'เติมเงิน' || msg === 'topup') {
        const name = await getDisplayName(userId);
        if (!name.includes('✅')) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..'
          });
          return;
        }

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'เลือกราคาเติมเงิน:\n100 บาท = 1,100 points\n500 บาท = 5,500 points\n1,000 บาท = 11,000 points\n3,000 บาท = 33,000 points\n10,000 บาท = 113,000 points\n\nหรือพิมพ์ยอดเองได้เลยค่ะ'
        });
      }

      // เพิ่ม logic อื่น ๆ ตรงนี้ตามที่ลิตลี่ช่วยบอสเขียนไว้ก่อนหน้านี้ค่ะ
    }
  }

  res.status(200).end();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
