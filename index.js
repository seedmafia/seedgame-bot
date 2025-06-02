const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

app.use(bodyParser.json());

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const userId = event.source.userId;

      // เงื่อนไขเบื้องต้น
      if (userMessage === 'เติมเงิน' || userMessage.toLowerCase() === 'topup') {
        await sendMessage(userId, `กรุณาเลือกราคาที่ต้องการเติมค่ะ`);
      } else {
        await sendMessage(userId, `กรุณาพิมพ์ "เติมเงิน" หรือ "topup" เพื่อเริ่มใช้งานค่ะ`);
      }
    }
  }

  res.status(200).end();
});

async function sendMessage(userId, message) {
  try {
    await client.pushMessage(userId, {
      type: 'text',
      text: message,
    });
  } catch (err) {
    console.error('ส่งข้อความล้มเหลว:', err);
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 เริ่มต้นเซิร์ฟเวอร์ที่พอร์ต ${port}`);
});
