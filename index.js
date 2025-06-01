// index.js
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

// Serve images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// User sessions (จำไว้ว่าลูกค้าคนนี้อยู่ขั้นตอนไหน)
const session = {};

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error('Webhook error:', err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return Promise.resolve(null);

  const msg = event.message.text.trim().toLowerCase();
  const userId = event.source.userId;
  const profile = await client.getProfile(userId);

  // เช็คว่าเป็นมาเฟีย
  if (!profile.displayName.includes('✅')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..'
    });
  }

  // เริ่มขั้นตอนเติมเงิน
  if (msg === 'เติมเงิน') {
    session[userId] = { step: 'await_amount' };
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text:
        'กรุณาพิมจำนวนเงินที่ท่านต้องการเติมค่ะ\n' +
        '💸 100 = 1100 พ้อยท์\n' +
        '💸 500 = 5500 พ้อยท์\n' +
        '💸 1000 = 11000 พ้อยท์\n' +
        '💸 3000 = 33000 พ้อยท์\n' +
        '💸 10000 = 113000 พ้อยท์\n' +
        '\nหากต้องการระบุจำนวนอื่น ให้พิมพ์ตัวเลขเช่น: 920'
    });
  }

  // รับจำนวนเงินที่ลูกค้าพิม
  if (session[userId]?.step === 'await_amount') {
    const amount = parseInt(msg);
    if (isNaN(amount) || amount < 1) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาพิมเฉพาะจำนวนเงินเป็นตัวเลข เช่น 100 500 1000 ค่ะ'
      });
    }
    session[userId] = { step: 'await_aid', amount };
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'โปรดพิมพ์รหัส AID ของท่านเพื่อเริ่มการเติมเงินค่ะ เช่น:\nAID123456'
    });
  }

  // รับรหัส AID แล้วเริ่มเติมเงิน
  if (session[userId]?.step === 'await_aid' && msg.startsWith('aid')) {
    const aid = msg.toUpperCase();
    const amount = session[userId].amount;
    delete session[userId];
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `กำลังดำเนินการเติมเงิน ${amount} บาท ให้กับ ${aid} กรุณารอสักครู่ค่ะ...`
    });
    await execTopup(client, userId, aid, amount);
    return;
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Bot server is running at port ${port}`);
});


