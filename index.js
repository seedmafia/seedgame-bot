const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
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
      text: 'โปรดเลือกยอดเติม:
20 บาท = 220 พ้อย
100 บาท = 1,100 พ้อย
500 บาท = 5,500 พ้อย
1,000 บาท = 11,000 พ้อย
10,000 บาท = 113,000 พ้อย
(ระบบปุ่มยังไม่พร้อม)'
    });
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot server is running at port ${port}`);
});
