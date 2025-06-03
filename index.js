// ✅ index.js (ฝั่ง Render - Webhook)
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// 📥 POST: เขียน queue.json เมื่อมีคำสั่งเติมเงิน
app.post('/queue', (req, res) => {
  const queue = req.body;
  try {
    fs.writeFileSync('queue.json', JSON.stringify(queue, null, 2));
    res.send({ message: 'อัปเดตคิวเรียบร้อยแล้วค่ะ' });
  } catch (err) {
    res.status(500).send({ error: 'ไม่สามารถเขียนไฟล์ queue ได้ค่ะ' });
  }
});

// 📤 GET: ให้ฝั่ง bot.js ดึง queue ล่าสุดไปดำเนินการ
app.get('/queue', (req, res) => {
  try {
    const data = fs.readFileSync('queue.json', 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (err) {
    res.status(500).send({ error: 'ไม่พบไฟล์ queue.json ค่ะ' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server เริ่มที่พอร์ต ${PORT}`);
});