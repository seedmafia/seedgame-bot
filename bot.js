    await page.waitForTimeout(2000);

    // กรอกจำนวนเงินตามที่ลูกค้าระบุ
    const amountInputSelector = 'input[name="amount"]';
    await page.waitForSelector(amountInputSelector);
    await page.fill(amountInputSelector, amount.toString());

    // กดปุ่ม "ส่งพอยต์"
    await page.click('text=ส่งพอยต์');
    await page.waitForSelector('input[name="aid"]', { timeout: 5000 });
    await page.fill('input[name="aid"]', aid);
    await page.click('text=ยืนยัน');

    // รอแล้วกด QR Code
    await page.waitForSelector('text=QR Code', { timeout: 5000 });
    await page.click('text=QR Code');
    await page.waitForSelector('div.qr-box img');

    // แคปภาพ QR Code
    const qrElement = await page.$('div.qr-box');
    const qrPath = path.join(__dirname, `public/images/qr-${userId}.png`);
    await qrElement.screenshot({ path: qrPath });

    await client.pushMessage(userId, [
      { type: 'text', text: 'กรุณาส่งสลิปการโอนเงินไว้เป็นหลักฐานด้วยค่ะ' },
      {
        type: 'image',
        originalContentUrl: `https://seedgame-bot.onrender.com/images/qr-${userId}.png`,
        previewImageUrl: `https://seedgame-bot.onrender.com/images/qr-${userId}.png`
      }
    ]);

    let success = false;
    const timeout = Date.now() + 2 * 60 * 1000;

    while (Date.now() < timeout) {
      const html = await page.content();
      if (html.includes('ชำระเงินเรียบร้อย')) {
        success = true;
        break;
      }
      await page.waitForTimeout(3000);
    }

    if (success) {
      const donePath = path.join(__dirname, `public/images/done-${userId}.png`);
      await page.screenshot({ path: donePath, fullPage: true });

      await client.pushMessage(userId, [
        {
          type: 'text',
          text: 'ยอดเติมพ้อยท์ของท่านสมาชิกเรียบร้อย ขอขอบคุณ​มาก 🙏🥰'
        },
        {
          type: 'image',
          originalContentUrl: `https://seedgame-bot.onrender.com/images/done-${userId}.png`,
          previewImageUrl: `https://seedgame-bot.onrender.com/images/done-${userId}.png`
        }
      ]);
    } else {
      await client.pushMessage(userId, {
        type: 'text',
        text: 'คำสั่งถูกยกเลิกเนื่องจากไม่มีการชำระเงินภายใน 5 นาทีค่ะ'
      });
    }

  } catch (err) {
    console.error(err);
    await client.pushMessage(userId, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการดำเนินการค่ะ'
    });
  } finally {
    await browser.close();
    delete pendingOrders[userId];
  }
}

module.exports = { execTopup };