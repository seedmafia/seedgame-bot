require('dotenv').config();
const express = require('express');
const { middleware, client, getDisplayName } = require('./line');
const fs = require('fs');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(middleware);

let pending = null;
let lastRequestTime = 0;

const allowAmounts = [100, 500, 1000, 3000, 10000];
const availableAmounts = Array.from({ length: 5000 }, (_, i) => (i + 1) * 20).filter(a => ![10, 30, 50, 70, 90].includes(a));

app.post('/webhook', async (req, res) => {
  const event = req.body.events[0];
  const userId = event.source.userId;
  const message = event.message?.text?.trim();

  if (!event.message || event.message.type !== 'text') return res.sendStatus(200);

  const name = await getDisplayName(userId);
  if (!name.includes('✅')) {
    await client.replyMessage(event.replyToken, { type: 'text', text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..' });
    return res.sendStatus(200);
  }

  const now = Date.now();
  if (pending && now - lastRequestTime < 300000) { // 5 นาที
    await client.replyMessage(event.replyToken, { type: 'text', text: 'ขออภัย กำลังดำเนินการรายการก่อนหน้า กรุณารอสักครู่ค่ะ' });
    return res.sendStatus(200);
  }

  if (!pending) {
    if (message.toLowerCase() === 'เติมเงิน' || message.toLowerCase() === 'topup') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `กรุณาเลือกราคาที่ต้องการเติมค่ะ
- 100 บาท ได้ 1,100 points
- 500 บาท ได้ 5,500 points
- 1000 บาท ได้ 11,000 points
- 3000 บาท ได้ 33,000 points
- 10000 บาท ได้ 113,000 points

หรือพิมพ์จำนวนเงินเอง (20, 40, 60, ... สูงสุด 100,000 บาท)`
      });
      return res.sendStatus(200);
    }

    const amount = parseInt(message);
    if (!isNaN(amount)) {
      if (allowAmounts.includes(amount) || availableAmounts.includes(amount)) {
        pending = { step: 1, amount, userId, replyToken: event.replyToken };
        lastRequestTime = now;
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `ยอด ${amount} บาทค่ะ กรุณาพิมพ์ AID 25 หลักของท่านเลยค่ะ`
        });
        return res.sendStatus(200);
      }
    }
  }

  if (pending?.step === 1 && /^[A-Z0-9]{25}$/i.test(message)) {
    pending.aid = message.toUpperCase();
    pending.step = 2;

    fs.writeFileSync('pending.json', JSON.stringify(pending, null, 2));

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `กำลังเติมเงิน ${pending.amount} บาทให้กับ AID: ${pending.aid} ค่ะ กรุณารอสักครู่...`
    });

    exec('node bot.js', (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        client.pushMessage(pending.userId, { type: 'text', text: 'เกิดข้อผิดพลาดระหว่างเติมเงินค่ะ กรุณาลองใหม่หรือติดต่อแอดมินค่ะ' });
        pending = null;
        return;
      }
    });

    return res.sendStatus(200);
  }

  return res.sendStatus(200);
});

app.listen(3000, () => {
  console.log('seedgame-bot is running on port 3000');
});
