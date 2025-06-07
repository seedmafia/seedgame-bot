
// ✅ index.js (ฝั่ง Render - Webhook)
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

let tempQueue = {}; // เก็บสถานะข้อความล่าสุดของผู้ใช้แยกตาม userId

// 📥 POST: เขียน queue.json
app.post('/queue', (req, res) => {
  const queue = req.body;
  try {
    fs.writeFileSync('queue.json', JSON.stringify(queue, null, 2));
    res.send({ message: 'อัปเดตคิวเรียบร้อยแล้วค่ะ' });
  } catch (err) {
    res.status(500).send({ error: 'ไม่สามารถเขียนไฟล์ queue ได้ค่ะ' });
  }
});

// 📤 GET: ส่ง queue.json
app.get('/queue', (req, res) => {
  try {
    const data = fs.readFileSync('queue.json', 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (err) {
    res.status(500).send({ error: 'ไม่พบไฟล์ queue.json ค่ะ' });
  }
});

// 🧠 POST: LINE Webhook
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events || events.length === 0) return res.sendStatus(200);

  const event = events[0];
  const userId = event.source.userId;
  const message = event.message?.text?.trim();

  // เริ่มต้นด้วย "เติมเงิน"
  if (message === 'เติมเงิน' || message.toLowerCase() === 'topup') {
    tempQueue[userId] = { step: 'amount' };
    return reply(event.replyToken, `กรุณาเลือกราคาเติมเงินค่ะ
- 100 บาท ได้ 1,100 points
- 500 บาท ได้ 5,500 points
- 1,000 บาท ได้ 11,000 points
- 3,000 บาท ได้ 33,000 points
- 10,000 บาท ได้ 113,000 points`);
  }

  // ตรวจสอบขั้นตอนที่รอ
  const state = tempQueue[userId];
  if (state?.step === 'amount') {
    const amt = parseInt(message);
    if (!isNaN(amt)) {
      tempQueue[userId] = { step: 'aid', amount: amt };
      return reply(event.replyToken, 'กรุณาพิมพ์รหัส AID (25 ตัวอักษร) ของคุณค่ะ');
    }
  }

  if (state?.step === 'aid') {
    if (message.length === 25 && /^[A-Z0-9]+$/.test(message)) {
      const newItem = { amount: state.amount, aid: message, status: 'pending' };
      try {
        await axios.post('http://localhost:10000/queue', newItem);
        delete tempQueue[userId];
        return reply(event.replyToken, `รับคำสั่งเติมเงินแล้วค่ะ
ยอด ${state.amount} บาท AID: ${message}
ระบบกำลังดำเนินการให้อัตโนมัติค่ะ`);
      } catch (e) {
        return reply(event.replyToken, 'เกิดข้อผิดพลาดในการส่งคำสั่งเติมเงินค่ะ');
      }
    } else {
      return reply(event.replyToken, 'AID ต้องมีความยาว 25 ตัวอักษร (ตัวใหญ่/ตัวเลข) เท่านั้นค่ะ');
    }
  }

  res.sendStatus(200);
});

function reply(token, msg) {
  return axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken: token,
    messages: [{ type: 'text', text: msg }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <fedX6qeThfl/AkLuJjqm/NZsw6XJQzGuU3YV/Uplx/LFXyF/d1jhjwDeOPMiX0CNbYBV46CuxbwhgzxVLqsrFlABDsvWC+rVkLvLNQhQ1Q6kUeqO+HDwiiFWbTnKQC5u6zgIiuihoT6SA/DbXNQ4PwdB04t89/1O/w1cDnyilFU=>'
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server เริ่มที่พอร์ต ${PORT}`);
});
