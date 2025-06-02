
const fs = require('fs');
const { chromium } = require('playwright');

async function runBot() {
  console.log('[BOT] Waiting for pending.json...');

  while (true) {
    if (fs.existsSync('pending.json')) {
      try {
        const data = JSON.parse(fs.readFileSync('pending.json', 'utf8'));
        if (!data.amount || !data.aid) {
          console.log('[BOT] Invalid pending.json data.');
          await new Promise(res => setTimeout(res, 1000));
          continue;
        }

        console.log(`[BOT] Start processing ${data.amount} Baht for AID: ${data.aid}`);

        const browser = await chromium.launch({
          headless: false,
          executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto("https://th-member.combocabalm.com/topup");

        // Wait for login and package buttons
        await page.waitForTimeout(10000);

        // Click package
        const amount = parseInt(data.amount);
        const priceMap = {
          20: 0, 100: 1, 500: 2, 1000: 3, 10000: 4, 50000: 5, 100000: 6
        };

        const priceIndex = priceMap[amount];
        if (priceIndex !== undefined) {
          await page.locator('button:has-text("+")').nth(priceIndex).click();
        } else {
          console.log("[BOT] Invalid amount or not in price map.");
          await browser.close();
          continue;
        }

        await page.getByRole('button', { name: 'Send Point' }).click();
        await page.getByPlaceholder('Enter AID').fill(data.aid);
        await page.getByRole('button', { name: 'Confirm' }).click();

        await page.waitForSelector('text=QR Code');
        await page.screenshot({ path: 'screenshot_qr.png' });

        console.log('[BOT] Screenshot saved as screenshot_qr.png');
        await browser.close();

        fs.unlinkSync('pending.json');
        console.log('[BOT] Done and pending.json removed.');
      } catch (err) {
        console.error('[BOT] Error:', err);
      }
    }
    await new Promise(res => setTimeout(res, 1000));
  }
}

runBot();
