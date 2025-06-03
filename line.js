// line.js
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

async function getDisplayName(userId) {
  try {
    const profile = await client.getProfile(userId);
    return profile.displayName;
  } catch (err) {
    console.error('getDisplayName error:', err);
    return '';
  }
}

module.exports = {
  client,
  getDisplayName,
};
