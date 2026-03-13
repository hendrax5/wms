const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Login first
    await page.goto('http://localhost:3000/login');
    await page.type('#username', 'hendra@servicex.id');
    await page.type('#password', '!Tahun2026');
    await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]')
    ]);

    // Wait for auth to settle
    await new Promise(r => setTimeout(r, 2000));

    // Capture Master Data Hub
    await page.goto('http://localhost:3000/master');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'master_hub.png' });

    // Capture Categories
    await page.goto('http://localhost:3000/master/categories');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'master_categories.png' });

    // Capture Items
    await page.goto('http://localhost:3000/master/items');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'master_items.png' });

    console.log("Screenshots captured");
    await browser.close();
}

run().catch(console.error);
