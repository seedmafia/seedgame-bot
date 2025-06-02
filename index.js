const express = require('express');
const bodyParser = require('body-parser');
const { client, getDisplayName } = require('./line');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

let pending = null;

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const msg = event.message.text.trim();
      const userId = event.source.userId;
      const name = await getDisplayName(userId);

      if (!name.includes('✅')) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..'
        });
        continue;
      }

      if (!pending) {
        if (msg === 'เติมเงิน' || msg.toLowerCase() === 'topup') {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text:
\`กรุณาเลือกราคาที่ต้องการเติมค่ะ
- 100 บาท ได้ 1,100 points
- 500 บาท ได้ 5,500 points
- 1000 บาท ได้ 11,000 points
- 3000 บาท ได้ 33,000 points
- 10000 บาท ได้ 113,000 points

หรือพิมพ์จำนวนเงินเอง (20, 40, 60, ... สูงสุด 100,000 บาท)\`
          });
          pending = { userId };
        }
      } else if (!pending.amount && /^\d+$/.test(msg)) {
        const amount = parseInt(msg);
        if ([10, 30, 50, 70, 90].includes(amount)) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'ขออภัย ไม่รองรับยอดนี้ กรุณาระบุใหม่ (ขั้นต่ำ 20 และเพิ่มครั้งละ 20)'
          });
          continue;
        }
        pending.amount = amount;
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: \`\${amount} บาทค่ะ กรุณาพิมพ์ AID 25 หลักของท่านเลยค่ะ\`
        });
      } else if (!pending.aid && msg.length === 25) {
        pending.aid = msg;
        fs.writeFileSync('pending.json', JSON.stringify(pending, null, 2));
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: \`กำลังเติมเงิน \${pending.amount} บาทให้กับ AID: \${pending.aid} ค่ะ กรุณารอสักครู่...\`
        });
      }
    }
  }
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log('seedgame-bot is running on port 3000');
});