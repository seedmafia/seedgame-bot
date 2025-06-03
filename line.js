const fs = require("fs");
const path = require("path");
const line = require("@line/bot-sdk");

const queuePath = path.join(__dirname, "queue.json");
const tempMap = new Map();

const handleEvent = async (event, client) => {
  try {
    if (event.type !== "message" || event.message.type !== "text") return;

    const userId = event.source.userId;
    const replyToken = event.replyToken;
    const message = event.message.text.trim();
    const profile = await client.getProfile(userId);
    const name = profile.displayName;

    if (["เติมเงิน", "topup"].includes(message.toLowerCase())) {
      if (!name.includes("✅")) {
        return client.replyMessage(replyToken, {
          type: "text",
          text: "You Not Mafia​ คุณไม่ใช่มาเฟีย..",
        });
      }

      return client.replyMessage(replyToken, {
        type: "text",
        text: "กรุณาเลือกราคาเติมเงินค่ะ\n- 100 บาท ได้ 1,100 points\n- 500 บาท ได้ 5,500 points\n- 1,000 บาท ได้ 11,000 points\n- 3,000 บาท ได้ 33,000 points\n- 10,000 บาท ได้ 113,000 points",
      });
    }

    const validAmounts = [100, 500, 1000, 3000, 10000];
    const amount = parseInt(message);
    if (validAmounts.includes(amount)) {
      saveTemp(userId, { step: "await_aid", amount });
      return client.replyMessage(replyToken, {
        type: "text",
        text: "กรุณาพิมพ์รหัส AID (25 ตัวอักษร) ของคุณค่ะ",
      });
    }

    if (/^[A-Z0-9]{25}$/i.test(message)) {
      const temp = loadTemp(userId);
      if (!temp || temp.step !== "await_aid") return;

      const order = {
        userId,
        name,
        amount: temp.amount,
        aid: message,
        timestamp: new Date().toISOString(),
      };

      const queue = fs.existsSync(queuePath)
        ? JSON.parse(fs.readFileSync(queuePath))
        : [];

      queue.push(order);
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
      clearTemp(userId);

      return client.replyMessage(replyToken, {
        type: "text",
        text: `รับคำสั่งเติมเงินแล้วค่ะ\nยอด ${temp.amount} บาท AID: ${message}\nระบบกำลังดำเนินการให้อัตโนมัติค่ะ`,
      });
    }
  } catch (err) {
    console.error("❌ line.js error:", err);
  }
};

function saveTemp(userId, data) {
  tempMap.set(userId, data);
  setTimeout(() => tempMap.delete(userId), 10 * 60 * 1000);
}

function loadTemp(userId) {
  return tempMap.get(userId);
}

function clearTemp(userId) {
  tempMap.delete(userId);
}

module.exports = { handleEvent };