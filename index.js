const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();

app.use(express.json());

// ตอบกลับ OK สำหรับ Verify webhook
app.get('/', (req, res) => res.send('OK'));

app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('Webhook triggered');
  if (!req.body.events || req.body.events.length === 0) {
    return res.status(200).end(); // ตอบกลับ 200 ถ้าไม่มี event
  }

  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error('Error in handleEvent:', err);
      res.status(500).end(); // ตอบกลับ 500 ถ้ามี error
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userDisplayName = event.source.userId;

  if (!userDisplayName.includes('✅')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..'
    });
  }

  const msg = event.message.text.toLowerCase();
  if (msg === 'เติมเงิน' || msg === 'topup') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text:
        'โปรดเลือกยอดเติม:\n' +
        '20 บาท = 220 พ้อย\n' +
        '100 บาท = 1,100 พ้อย\n' +
        '500 บาท = 5,500 พ้อย\n' +
        '1,000 บาท = 11,000 พ้อย\n' +
        '10,000 บาท = 113,000 พ้อย\n' +
        '(ระบบปุ่มยังไม่พร้อม)'
    });
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot server is running at port ${port}`);
});
