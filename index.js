const express = require('express');
const path = require('path');
const { client } = require('./line');
const { execTopup } = require('./bot');

const app = express();
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));

const conversationState = {};

app.post('/webhook', async (req, res) => {
  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const msg = event.message.text.trim();
      const state = conversationState[userId] || { stage: null, amount: null };

      if (msg === 'เติม' && !state.stage) {
        conversationState[userId] = { stage: 'awaiting_amount', amount: null };
        await client.pushMessage(userId, {
          type: 'text',
          text: 'กรุณาพิมพ์ยอดเงินที่ต้องการเติม (บาท) ด้วยค่ะ'
        });
        continue;
      }

      if (state.stage === 'awaiting_amount' && !isNaN(msg)) {
        const amount = parseInt(msg, 10);
        conversationState[userId] = { stage: 'awaiting_aid', amount };
        await client.pushMessage(userId, {
          type: 'text',
          text: `ยอด ${amount} บาทค่ะ กรุณาพิมพ์ AID ของท่านค่ะ`
        });
        continue;
      }

      if (state.stage === 'awaiting_amount' && isNaN(msg)) {
        await client.pushMessage(userId, {
          type: 'text',
          text: 'กรุณาพิมพ์ยอดเงินเป็นตัวเลขเท่านั้นค่ะ'
        });
        continue;
      }

      if (state.stage === 'awaiting_aid') {
        const aid = msg;
        const amount = state.amount;
        execTopup(client, userId, aid, amount);
        delete conversationState[userId];
        continue;
      }

      const tokens = msg.split(' ');
      if (tokens[0] === 'เติม' && tokens.length === 3 && !isNaN(tokens[2])) {
        const aid = tokens[1];
        const amount = parseInt(tokens[2], 10);
        execTopup(client, userId, aid, amount);
        delete conversationState[userId];
        continue;
      }
    }
  }
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('✅ Seedgame Bot is running!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Listening on port ${port}`);
});
