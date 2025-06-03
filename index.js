// ✅ index.js (Webhook Server)
require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');
const { client, getDisplayName } = require('./line');
const fs = require('fs');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
app.use(bodyParser.json());

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.trim();
      const userId = event.source.userId;
      const name = await getDisplayName(userId);

      if (userMessage === 'เติมเงิน' || userMessage.toLowerCase() === 'topup') {
        await client.pushMessage(userId, {
          type: 'text',
          text: `เลือกจำนวนเงินที่ต้องการเติมค่ะ:\n- 100 บาท ได้ 1,100 points\n- 500 บาท ได้ 5,500 points\n- 1,000 บาท ได้ 11,000 points\n- 3,000 บาท ได้ 33,000 points\n- 10,000 บาท ได้ 113,000 points\n\nหรือพิมพ์จำนวนเองได้ เช่น 920`,
        });
      } else if (/^\d{2,5}$/.test(userMessage)) {
        fs.writeFileSync('state.json', JSON.stringify({ userId, step: 'await_aid', amount: parseInt(userMessage) }));
        await client.pushMessage(userId, {
          type: 'text',
          text: 'กรุณาส่ง AID ของคุณ (25 หลัก)',
        });
      } else if (/^[A-Z0-9]{25}$/.test(userMessage)) {
        const state = JSON.parse(fs.readFileSync('state.json', 'utf8'));
        if (state.userId === userId && state.step === 'await_aid') {
          const queue = fs.existsSync('queue.json') ? JSON.parse(fs.readFileSync('queue.json', 'utf8')) : [];
          queue.push({ userId, amount: state.amount, aid: userMessage });
          fs.writeFileSync('queue.json', JSON.stringify(queue, null, 2));
          fs.unlinkSync('state.json');
          await client.pushMessage(userId, {
            type: 'text',
            text: 'รับคำสั่งเติมเงินเรียบร้อยแล้วค่ะ คุณอยู่ในลำดับที่ ' + queue.length,
          });
        }
      }
    }
  }

  res.status(200).end();
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Server เริ่มที่พอร์ต ${port}`);
});

// ✅ line.js (LINE SDK client และ getDisplayName)
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

async function getDisplayName(userId) {
  try {
    const profile = await client.getProfile(userId);
    return profile.displayName;
  } catch (err) {
    console.error('getDisplayName error:', err);
    return '';
  }
}

module.exports = {
  client,
  getDisplayName,
};
