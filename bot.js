const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  while (true) {
    if (fs.existsSync('pending.json')) {
      const pending = JSON.parse(fs.readFileSync('pending.json', 'utf-8'));
      if (!pending.aid || !pending.amount) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      const browser = await chromium.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      });
      const page = await browser.newPage();
      await page.goto('https://news.combocabalm.com');

      try {
        await page.click('body > nav > div > div.d-flex.justify-content-center.justify-content-lg-center.align-items-center.w-lg-100 > ul > li:nth-child(3) > a');
        await page.waitForTimeout(2000);

        const pages = browser.contexts()[0].pages();
        const topupPage = pages[pages.length - 1];
        await topupPage.bringToFront();

        await topupPage.click('body > div > div.mb-auto > div > div.position-sticky.top-0.start-0 > div.navpc-box.p-2 > div > div > div.wallet-area > div:nth-child(1) > a');

        for (let i = 20; i < pending.amount; i += 20) {
          await topupPage.click('button.qty-count.qty-count--add');
        }

        await topupPage.click('div.custom-ipad-topup > div > div:nth-child(2) > button');
        await topupPage.fill('input[name="friendCode"]', pending.aid);
        await topupPage.click('form > button');
        await topupPage.click('div.bg-blue7.mt-4 > div > div:nth-child(2) > label');
        await topupPage.click('div.mt-3 > button');

        await topupPage.screenshot({ path: `qrcode_${Date.now()}.png` });
        fs.unlinkSync('pending.json');
        await browser.close();
      } catch (err) {
        console.error('❌ ERROR:', err);
        await browser.close();
      }
    }
    await new Promise(r => setTimeout(r, 5000));
  }
})();