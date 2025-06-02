const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

async function getDisplayName(userId) {
  try {
    const profile = await client.getProfile(userId);
    return profile.displayName;
  } catch (err) {
    return '';
  }
}

module.exports = {
  client,
  getDisplayName
};