const fs = require('fs');
const { chromium } = require('playwright');

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
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const current = queue[0];
    console.log('🔄 กำลังดำเนินการเติมเงินให้:', current);

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

      await topupPage.screenshot({ path: `qrcode_${Date.now()}.png` });

      const newQueue = loadQueue().slice(1);
      saveQueue(newQueue);

      await browser.close();
    } catch (err) {
      console.error('❌ ERROR:', err);
      await browser.close();
    }
  }
})();