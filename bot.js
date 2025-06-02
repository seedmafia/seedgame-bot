const fs = require('fs');
const { chromium } = require('playwright');
const { client } = require('./line');
const path = require('path');

const QUEUE_FILE = 'queue.json';

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

(async () => {
  while (true) {
    const queue = loadQueue();
    if (queue.length === 0) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    const current = queue[0];
    console.log('🔄 เริ่มเติมเงินให้:', current);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://th-member.combocabalm.com/topup');

    try {
      const needReset = await page.$('#swal2-html-container > div > div');
      if (needReset) {
        const resetBtn = await page.$('button.swal2-confirm');
        if (resetBtn) await resetBtn.click();
      }

      await page.click('body > nav > div > div.d-flex.justify-content-center.justify-content-lg-center.align-items-center.w-lg-100 > ul > li:nth-child(3) > a');
      await page.waitForTimeout(2000);
      const pages = browser.contexts()[0].pages();
      const topupPage = pages[pages.length - 1];
      await topupPage.bringToFront();

      await topupPage.click('body > div > div.mb-auto > div > div.position-sticky.top-0.start-0 > div.navpc-box.p-2 > div > div > div.wallet-area > div:nth-child(1) > a');

      for (let i = 20; i < current.amount; i += 20) {
        await topupPage.click('button.qty-count.qty-count--add');
      }

      await topupPage.click('div.custom-ipad-topup > div > div:nth-child(2) > button');
      await topupPage.fill('input[name="friendCode"]', current.aid);
      await topupPage.click('form > button');
      await topupPage.click('div.bg-blue7.mt-4 > div > div:nth-child(2) > label');
      await topupPage.click('div.mt-3 > button');

      const timestamp = Date.now();
      const outputDir = path.join(__dirname, 'public/qr');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const qrFile = `qr-${timestamp}.png`;
      const qrPath = path.join(outputDir, qrFile);
      await topupPage.screenshot({ path: qrPath });

      await client.pushMessage(current.userId, {
        type: 'image',
        originalContentUrl: `https://seedgame-bot.onrender.com/qr/${qrFile}`,
        previewImageUrl: `https://seedgame-bot.onrender.com/qr/${qrFile}`
      });

      await client.pushMessage(current.userId, {
        type: 'text',
        text: 'กรุณาส่งสลิปการโอนเงินยืนยันด้วยนะค่ะ'
      });

      // เฝ้ารอผลลัพธ์
      const start = Date.now();
      let isPaid = false;

      while (Date.now() - start < 300000) {
        const paid = await topupPage.$('div.text-success:has-text("เติมเงินสำเร็จ")');
        if (paid) {
          const successFile = `success-${timestamp}.png`;
          const successPath = path.join(outputDir, successFile);
          await topupPage.screenshot({ path: successPath });

          await client.pushMessage(current.userId, {
            type: 'image',
            originalContentUrl: `https://seedgame-bot.onrender.com/qr/${successFile}`,
            previewImageUrl: `https://seedgame-bot.onrender.com/qr/${successFile}`
          });

          await client.pushMessage(current.userId, {
            type: 'text',
            text: 'เติมเงินสำเร็จแล้ว ขอบคุณที่ใช้บริการค่ะ'
          });
          isPaid = true;
          break;
        }
        await new Promise(r => setTimeout(r, 3000));
      }

      if (!isPaid) {
        await client.pushMessage(current.userId, {
          type: 'text',
          text: 'ระบบยกเลิกรายการของคุณ เนื่องจากไม่ชำระเงินภายใน 5 นาทีค่ะ'
        });
      }

      const newQueue = loadQueue().slice(1);
      saveQueue(newQueue);
      await browser.close();
    } catch (err) {
      console.error('❌ ERROR:', err);
      await browser.close();
    }
  }
})();