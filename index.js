const express = require('express');
const line = require('@line/bot-sdk');
const { execTopup } = require('./bot');
const path = require('path');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();

app.use(express.json());

// ✅ เสิร์ฟไฟล์ภาพ QR จาก /public/images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// ✅ Webhook จาก LINE
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error('Webhook error:', err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const msg = event.message.text.toLowerCase();
  const userId = event.source.userId;

  const profile = await client.getProfile(userId);
  if (!profile.displayName.includes('✅')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..'
    });
  }

  if (msg === 'เติมเงิน' || msg === 'topup') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'โปรดพิมพ์รหัส AID ของท่านเพื่อเริ่มการเติมเงินค่ะ เช่น:\nAID123456'
    });
  }

  if (msg.startsWith('aid')) {
    const aid = msg.trim().toUpperCase();
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `กำลังดำเนินการเติมเงินให้กับ ${aid} กรุณารอสักครู่ค่ะ...`
    });
    await execTopup(client, userId, aid);
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Bot server is running at port ${port}`);
});

