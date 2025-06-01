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

// เสิร์ฟรูปภาพจาก public/images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// จัดการ raw body สำหรับ LINE Signature
app.post(
  '/webhook',
  line.middleware(config),
  express.json({ verify: (req, res, buf) => { req.rawBody = buf } }),
  (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
      .then(result => res.json(result))
      .catch(err => {
        console.error('Webhook error:', err);
        res.status(500).end();
      });
  }
);

const session = {}; // เก็บขั้นตอนของแต่ละ user

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return Promise.resolve(null);

  const msg = event.message.text.trim().toLowerCase();
  const userId = event.source.userId;
  const profile = await client.getProfile(userId);

  // ตรวจสอบสิทธิ์
  if (!profile.displayName.includes('✅')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..'
    });
  }

  // เริ่มเติมเงิน
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

  // รับยอดเงิน
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

  // รับ AID และเติมเงิน
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


