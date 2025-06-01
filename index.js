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

app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('🔔 Webhook triggered');

  if (!req.body.events || req.body.events.length === 0) {
    console.log('⚠️ No events in body');
    return res.status(200).send('No event');
  }

  Promise.all(req.body.events.map(handleEvent))
    .then(result => {
      console.log('✅ Events handled:', result);
      res.status(200).json(result);
    })
    .catch(err => {
      console.error('❌ Error handling events:', err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const msg = event.message.text.toLowerCase();
  const userId = event.source.userId;

  // ข้ามการตรวจชื่อ ✅ ชั่วคราวเพื่อให้บอทตอบกลับได้
  if (msg === 'เติมเงิน' || msg === 'topup') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'โปรดเลือกยอดเติม:\n20 บาท = 220 พ้อย\n100 บาท = 1,100 พ้อย\n500 บาท = 5,500 พ้อย\n1,000 บาท = 11,000 พ้อย\n10,000 บาท = 113,000 พ้อย\n(ระบบปุ่มยังไม่พร้อม)'
    });
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..'
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Bot server is running at port ${port}`);
});
