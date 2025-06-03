// ✅ bot.js (ฝั่งคอมพิวเตอร์บอส - ใช้ Playwright)
const axios = require('axios');
const { chromium } = require('playwright');

async function fetchQueue() {
  try {
    const res = await axios.get('https://seedgame-bot.onrender.com/queue');
    return res.data;
  } catch (err) {
    console.error('โหลด queue ไม่ได้:', err.message);
    return null;
  }
}

async function runBot() {
  const queue = await fetchQueue();
  if (!queue || queue.status !== 'pending') return;

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://th-member.combocabalm.com/topup');
    await page.waitForTimeout(1000);

    // คลิกปุ่มเติมเงิน (รอบแรก)
    await page.click('a[href="/topup"]');
    await page.waitForTimeout(2000);

    // กดอีกครั้ง (รอบสอง)
    await page.click('a[href="/topup"]');
    await page.waitForSelector('div.package-card');

    // กดปุ่มแพ็กเกจตามยอดเงิน
    await page.click(`button[data-price="${queue.amount}"]`);
    await page.waitForTimeout(1000);

    // กรอก AID
    await page.fill('#aid-input', queue.aid);
    await page.click('#submit-btn');

    await page.waitForTimeout(5000);

    // 📸 แคปหน้าจอ QR หรือผลลัพธ์
    await page.screenshot({ path: `confirm_${Date.now()}.png` });

    await browser.close();
  } catch (err) {
    console.error('เกิดข้อผิดพลาด:', err.message);
    await browser.close();
  }
}

setInterval(runBot, 5000); // ตรวจสอบคิวทุก 5 วินาที
