const express = require('express');
const path = require('path');
const fs = require('fs');
const { client, getDisplayName } = require('./line');
const { execTopup } = require('./bot');

const app = express();
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));

const conversationState = {};
let isProcessing = false;
let lastStartTime = null;

function isValidAmount(amount) {
  return amount >= 20 && amount % 20 === 0;
}

function resetIfTimeout() {
  if (isProcessing && lastStartTime) {
    const elapsed = Date.now() - lastStartTime;
    if (elapsed > 5 * 60 * 1000) {
      isProcessing = false;
      lastStartTime = null;
    }
  }
}

app.post('/webhook', async (req, res) => {
  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const msg = event.message.text.trim();

      resetIfTimeout();

      const displayName = await getDisplayName(userId);
      if (!displayName.includes('✅')) {
        await client.pushMessage(userId, { type: 'text', text: 'You Not Mafia​ คุณไม่ใช่มาเฟีย..' });
        continue;
      }

      if (isProcessing) {
        await client.pushMessage(userId, { type: 'text', text: 'ขณะนี้ระบบกำลังเติมเงินให้ผู้ใช้อื่น กรุณารอสักครู่ค่ะ' });
        continue;
      }

      const state = conversationState[userId] || { stage: null, amount: null };

      if ((msg === 'เติมเงิน' || msg.toLowerCase() === 'topup') && !state.stage) {
        conversationState[userId] = { stage: 'awaiting_amount' };
        await client.pushMessage(userId, {
          type: 'text',
          text: 'กรุณาเลือกราคาที่ต้องการเติมค่ะ\n- 100 บาท ได้ 1,100 points\n- 500 บาท ได้ 5,500 points\n- 1000 บาท ได้ 11,000 points\n- 3000 บาท ได้ 33,000 points\n- 10000 บาท ได้ 113,000 points\n\nหรือพิมพ์จำนวนเงินเอง (20, 40, 60, ... สูงสุด 100,000 บาท)'
        });
        continue;
      }

      if (state.stage === 'awaiting_amount' && !isNaN(msg)) {
        const amount = parseInt(msg);
        if (!isValidAmount(amount)) {
          await client.pushMessage(userId, { type: 'text', text: 'กรุณาระบุจำนวนเงินเป็นเลขที่มีในระบบ เช่น 20, 40, 60, ... สูงสุด 100000 บาทค่ะ' });
          continue;
        }
        conversationState[userId] = { stage: 'awaiting_aid', amount };
        await client.pushMessage(userId, { type: 'text', text: `ยอด ${amount} บาทค่ะ กรุณาพิมพ์ AID 25 หลักของท่านเลยค่ะ` });
        continue;
      }

      if (state.stage === 'awaiting_aid' && /^[A-Z0-9]{25}$/i.test(msg)) {
        const aid = msg.trim();
        const amount = state.amount;

        conversationState[userId] = null;
        isProcessing = true;
        lastStartTime = Date.now();

        await client.pushMessage(userId, { type: 'text', text: `กำลังเติมเงิน ${amount} บาทให้กับ AID: ${aid} ค่ะ กรุณารอสักครู่...` });

        try {
          const result = await execTopup(userId, amount, aid);

          await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: result.imageUrl,
            previewImageUrl: result.imageUrl
          });

          if (result.imageUrl.includes('_qr.png')) {
            await client.pushMessage(userId, {
              type: 'text',
              text: 'กรุณาสแกน QR เพื่อชำระเงินค่ะ และส่งสลิปยืนยันกลับมาด้วยนะคะ ขอบคุณค่ะ'
            });
          } else {
            await client.pushMessage(userId, {
              type: 'text',
              text: 'เติมเงินสำเร็จ ขอบคุณที่ใช้บริการค่ะ'
            });
          }
        } catch (e) {
          await client.pushMessage(userId, { type: 'text', text: 'เกิดข้อผิดพลาดระหว่างเติมเงินค่ะ กรุณาลองใหม่หรือติดต่อแอดมินค่ะ' });
        }

        isProcessing = false;
        lastStartTime = null;
      }
    }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('seedgame-bot is running on port', PORT);
});