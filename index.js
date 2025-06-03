const express = require("express");
const line = require("@line/bot-sdk");
const fs = require("fs");
const path = require("path");
const { handleEvent } = require("./line");

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

app.post("/webhook", line.middleware(config), express.json(), (req, res) => {
  res.status(200).end();
  const events = req.body.events;
  if (!events || events.length === 0) return;
  events.forEach((event) => {
    handleEvent(event, client);
  });
});

// ✅ ให้ client-bot POST มาที่นี่พร้อมภาพ
app.use(express.json({ limit: '10mb' }));
app.post("/report-success", async (req, res) => {
  try {
    const { userId, imageBase64 } = req.body;
    const imagePath = path.join(__dirname, "public", `${userId}.jpg`);
    fs.writeFileSync(imagePath, Buffer.from(imageBase64, "base64"));

    // ตอบกลับลูกค้าใน LINE
    await client.pushMessage(userId, [
      {
        type: "image",
        originalContentUrl: `https://seedgame-bot.onrender.com/public/${userId}.jpg`,
        previewImageUrl: `https://seedgame-bot.onrender.com/public/${userId}.jpg`,
      },
      {
        type: "text",
        text: "ขอบคุณที่ใช้บริการค่ะ ระบบได้ทำรายการให้เรียบร้อยแล้วนะคะ ❤️",
      },
    ]);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ report-success error:", err.message);
    res.status(500).json({ error: "Failed to report success" });
  }
});

// serve image
app.use("/public", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server เริ่มที่พอร์ต ${PORT}`);
});

app.get("/queue", (req, res) => {
  const queue = JSON.parse(fs.readFileSync("queue.json"));
  res.json(queue);
});
