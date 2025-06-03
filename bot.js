const fs = require('fs');
const { chromium } = require('playwright');
const { client } = require('./line');

(async () => {
  while (true) {
    if (!fs.existsSync('queue.json')) {
      await delay(5000);
      continue;
    }

    let queue = JSON.parse(fs.readFileSync('queue.json', 'utf-8'));
    if (queue.length === 0) {
      await delay(5000);
      continue;
    }

    const current = queue[0];
    const { userId, amount, aid } = current;

    const browser = await chromium.launch({
      headless: false,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('https://th-member.combocabalm.com/topup');
      await page.waitForTimeout(3000);

      // หากเจอ popup "มีคำสั่งซื้อค้าง"
      const createNew = await page.$('#swal2-html-container > div > div');
      if (createNew) {
        await page.click('button.swal2-confirm');
        await page.waitForTimeout(1500);
      }

      await page.click('body > nav > div > div > ul > li:nth-child(3) > a'); // ปุ่มเติมเงิน
      await page.waitForTimeout(2000);

      const pages = context.pages();
      const topupPage = pages[pages.length - 1];
      await topupPage.bringToFront();

      await topupPage.click('div.wallet-area a'); // ปุ่ม +

      for (let i = 20; i < amount; i += 20) {
        await topupPage.click('button.qty-count.qty-count--add');
      }

      await topupPage.click('div.custom-ipad-topup > div > div:nth-child(2) > button');
      await topupPage.fill('input[name="friendCode"]', aid);
      await topupPage.click('form > button');
      await topupPage.click('div.bg-blue7.mt-4 > div > div:nth-child(2) > label');
      await topupPage.click('div.mt-3 > button');

      await topupPage.waitForTimeout(3000);

      const qrPath = `qr_${Date.now()}.png`;
      await topupPage.screenshot({ path: qrPath });

      await client.pushMessage(userId, [
        {
          type: 'image',
          originalContentUrl: `https://yourdomain.com/${qrPath}`, // ✅ ต้องใช้ URL จริงที่ Render โฮสต์ไฟล์นี้ไว้
          previewImageUrl: `https://yourdomain.com/${qrPath}`,
        },
        {
          type: 'text',
          text: 'กรุณาส่งสลิปการโอนเงินยืนยันด้วยนะค่ะ',
        },
      ]);

      const start = Date.now();
      let successSent = false;

      while (Date.now() - start < 2 * 60 * 1000) {
        const text = await topupPage.textContent('body');
        if (text.includes('เติมเงินสำเร็จ') || text.includes('ทำรายการสำเร็จ')) {
          const successImg = `success_${Date.now()}.png`;
          await topupPage.screenshot({ path: successImg });
          await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: `https://yourdomain.com/${successImg}`,
            previewImageUrl: `https://yourdomain.com/${successImg}`,
          });
          await client.pushMessage(userId, {
            type: 'text',
            text: 'ขอบคุณที่ใช้บริการค่ะ',
          });
          successSent = true;
          break;
        }
        await delay(3000);
      }

      if (!successSent) {
        await delay(3 * 60 * 1000); // รอจนครบ 5 นาที (รวม 2+3)
        await topupPage.goto('https://th-member.combocabalm.com/home');
      }

      queue.shift();
      fs.writeFileSync('queue.json', JSON.stringify(queue, null, 2));
      await browser.close();
    } catch (err) {
      console.error('❌ ERROR:', err);
      await browser.close();
    }
  }
})();

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}
