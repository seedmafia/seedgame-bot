require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');
const { getDisplayName } = require('./line');

// ✅ config LINE
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

// ✅ รองรับ JSON body
app.use(bodyParser.json());

// ✅ เสิร์ฟไฟล์จากโฟลเดอร์ public เช่น QR Code, success.png
app.use(express.static('public'));

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const userId = event.source.userId;
      const name = await getDisplayName(userId);

      if (!name.includes('✅')) {
        await sendMessage(userId, 'You Not Mafia​ คุณไม่ใช่มาเฟีย..');
        continue;
      }

      if (userMessage === 'เติมเงิน' || userMessage.toLowerCase() === 'topup') {
        await sendMessage(userId, `กรุณาเลือกราคาที่ต้องการเติมค่ะ`);
      } else if (/^\d{25}$/.test(userMessage)) {
        await sendMessage(userId, `กำลังดำเนินการเติมเงินให้กับ AID: ${userMessage} ค่ะ`);
        // เพิ่ม logic push ไปยัง queue.json
      } else {
        await sendMessage(userId, `กรุณาพิมพ์ "เติมเงิน" หรือ "topup" เพื่อเริ่มต้นค่ะ`);
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
    console.error('❌ ส่งข้อความล้มเหลว:', err);
  }
}

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Server เริ่มที่พอร์ต ${port}`);
});
