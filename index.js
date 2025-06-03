
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

let tempQueue = {};

app.post('/queue', (req, res) => {
  const queue = req.body;
  try {
    fs.writeFileSync('queue.json', JSON.stringify(queue, null, 2));
    res.send({ message: 'อัปเดตคิวเรียบร้อยแล้วค่ะ' });
  } catch (err) {
    res.status(500).send({ error: 'ไม่สามารถเขียนไฟล์ queue ได้ค่ะ' });
  }
});

app.get('/queue', (req, res) => {
  try {
    const data = fs.readFileSync('queue.json', 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (err) {
    res.status(500).send({ error: 'ไม่พบไฟล์ queue.json ค่ะ' });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) return res.sendStatus(200);

    const event = events[0];
    const userId = event.source.userId;
    const message = event.message?.text?.trim();

    if (message === 'เติมเงิน' || message.toLowerCase() === 'topup') {
      tempQueue[userId] = { step: 'amount' };
      await reply(event.replyToken, `กรุณาเลือกราคาเติมเงินค่ะ\n- 100 บาท ได้ 1,100 points\n- 500 บาท ได้ 5,500 points\n- 1,000 บาท ได้ 11,000 points\n- 3,000 บาท ได้ 33,000 points\n- 10,000 บาท ได้ 113,000 points`);
      return res.sendStatus(200);
    }

    const state = tempQueue[userId];
    if (state?.step === 'amount') {
      const amt = parseInt(message);
      if (!isNaN(amt)) {
        tempQueue[userId] = { step: 'aid', amount: amt };
        await reply(event.replyToken, 'กรุณาพิมพ์รหัส AID (25 ตัวอักษร) ของคุณค่ะ');
        return res.sendStatus(200);
      }
    }

    if (state?.step === 'aid') {
      if (message.length === 25 && /^[A-Z0-9]+$/.test(message)) {
        const newQueue = [{ amount: state.amount, aid: message, status: 'pending' }];
        await axios.post('http://localhost:10000/queue', newQueue);
        delete tempQueue[userId];
        await reply(event.replyToken, `รับคำสั่งเติมเงินแล้วค่ะ\nยอด ${state.amount} บาท AID: ${message}\nระบบกำลังดำเนินการให้อัตโนมัติค่ะ`);
        return res.sendStatus(200);
      } else {
        await reply(event.replyToken, 'AID ต้องมีความยาว 25 ตัวอักษร (ตัวใหญ่/ตัวเลข) เท่านั้นค่ะ');
        return res.sendStatus(200);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.sendStatus(200);
  }
});

function reply(token, msg) {
  return axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken: token,
    messages: [{ type: 'text', text: msg }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server เริ่มที่พอร์ต ${PORT}`);
});
