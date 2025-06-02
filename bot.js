const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const amountSelectorMap = {
  20: 1,
  100: 2,
  500: 3,
  1000: 4,
  10000: 5,
  50000: 6,
  100000: 7
};

async function execTopup(userId, amount, aid) {
  console.log('เริ่มทำงาน: execTopup');
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--start-maximized'],
    userDataDir: 'C:/Users/ADMIN/AppData/Local/Google/Chrome/User Data'
  });

  const page = await browser.newPage();
  try {
    console.log('กำลังเปิดหน้าเว็บเติมเงิน...');
    await page.goto('https://th-member.combocabalm.com/topup', { timeout: 60000 });
    console.log('โหลดหน้าเว็บสำเร็จ');

    const index = amountSelectorMap[amount];
    if (!index) throw new Error('ยอดเงินไม่ตรงกับแพ็กเกจที่รองรับ');

    const popupSelector = 'div:has-text("คุณมีคำสั่งซื้อที่รอชำระเงินอยู่") button:has-text("สร้างคำสั่งซื้อใหม่")';
    const hasPopup = await page.$(popupSelector);
    if (hasPopup) {
      console.log('เจอ popup คำสั่งซื้อค้าง กำลังกด "สร้างคำสั่งซื้อใหม่"...');
      await page.click(popupSelector);
    }

    console.log('เลือกแพ็กเกจ...');
    await page.click(`.grid > div:nth-of-type(${index}) button:has-text("+")`);
    await page.click('button:has-text("ส่งพ้อยท์")');

    console.log('กรอก AID...');
    await page.waitForSelector('input[placeholder="กรอก AID ของเพื่อน"]', { timeout: 10000 });
    await page.fill('input[placeholder="กรอก AID ของเพื่อน"]', aid);
    await page.click('button:has-text("ยืนยัน")');

    console.log('รอ QR Code...');
    await page.waitForSelector('button:has-text("QR Code")', { timeout: 15000 });
    await page.click('button:has-text("QR Code")');
    await page.waitForSelector('img.qr-image', { timeout: 15000 });

    const qrPath = path.join(__dirname, 'public/images', `${userId}_qr.png`);
    const qrSection = await page.locator('div[class*="payment"]').first();
    await qrSection.screenshot({ path: qrPath });

    const start = Date.now();
    let successCaptured = false;
    let successPath = '';

    while (Date.now() - start < 300000) {
      const successElement = await page.$('text=ชำระเงินเรียบร้อย');
      if (successElement) {
        console.log('ตรวจพบว่าชำระเงินเรียบร้อย');
        successPath = path.join(__dirname, 'public/images', `${userId}_success.png`);
        const successBox = await page.locator('div[class*="payment"]').first();
        await successBox.screenshot({ path: successPath });
        successCaptured = true;
        break;
      }
      await page.waitForTimeout(5000);
    }

    if (!successCaptured) {
      console.log('หมดเวลา รอไม่สำเร็จ กลับหน้าหลัก');
      await page.goBack();
    }

    await browser.close();

    if (successCaptured) {
      return {
        imageUrl: `${process.env.BASE_URL || 'https://seedgame-bot.onrender.com'}/images/${userId}_success.png`
      };
    } else {
      return {
        imageUrl: `${process.env.BASE_URL || 'https://seedgame-bot.onrender.com'}/images/${userId}_qr.png`
      };
    }
  } catch (e) {
    console.error('เกิดข้อผิดพลาดใน execTopup:', e.message);
    await browser.close();
    throw new Error('เกิดปัญหาระหว่างทำรายการ');
  }
}

module.exports = { execTopup };