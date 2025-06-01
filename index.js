const express = require('express');
const { client } = require('./line');
const { execTopup } = require('./bot');
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const msg = event.message.text.trim();
      if (msg.startsWith('เติม')) {
        const [_, aid, amount] = msg.split(' ');
        if (aid && amount) {
          execTopup(client, userId, aid, parseInt(amount));
        }
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
