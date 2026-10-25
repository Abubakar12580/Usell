import { chromium } from 'playwright';
import fs from 'node:fs';

const base = 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('requestfailed', (request) => { if (!request.url().includes('ws')) errors.push(`request: ${request.url()} ${request.failure()?.errorText}`); });

await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForSelector('.product-card');
console.log('Home product cards:', await page.locator('.product-card').count());
console.log('Home title:', await page.title());
await page.screenshot({ path: 'usell-home-desktop.png', fullPage: false });
await page.screenshot({ path: 'usell-home-full.png', fullPage: true });

await page.getByRole('button', { name: 'Search', exact: true }).first().click();
await page.getByLabel('Search listings').fill('Nike');
await page.waitForSelector('.search-result');
console.log('Predictive search:', await page.locator('.search-result').first().innerText());
await page.keyboard.press('Escape');

await page.goto(`${base}/shop?category=Women`, { waitUntil: 'networkidle' });
await page.waitForSelector('.product-card');
console.log('Women results:', await page.locator('.product-card').count());

await page.goto(`${base}/listing/l_dress`, { waitUntil: 'networkidle' });
await page.waitForSelector('.listing-info h1');
console.log('Listing:', await page.locator('.listing-info h1').innerText());

await page.goto(`${base}/auth`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Demo buyer' }).click();
await page.waitForURL(/account/);
await page.waitForSelector('.account-stats');
console.log('Buyer login: account loaded');

await page.goto(`${base}/sell`, { waitUntil: 'networkidle' });
await page.locator('input[type=file]').setInputFiles('public/images/tshirt.jpg');
await page.getByRole('button', { name: 'Continue' }).click();
await page.getByPlaceholder('e.g. Zara satin midi dress').fill('Browser tested white tee');
await page.getByPlaceholder('e.g. Zara (optional)').fill('H&M');
await page.getByPlaceholder('e.g. Emerald green').fill('White');
await page.locator('select').nth(0).selectOption('Men');
await page.getByPlaceholder('e.g. Dresses, Sneakers').fill('T-shirts');
await page.locator('select').nth(1).selectOption('L');
await page.getByPlaceholder('Describe the fit, fabric, measurements, how often it was used, and any flaws buyers should know about…').fill('A clean cotton tee used for the browser upload and publishing workflow test.');
await page.getByText('Good', { exact: true }).last().click();
await page.getByRole('button', { name: 'Continue' }).click();
await page.locator('.big-price-input input').fill('1400');
await page.getByRole('button', { name: 'Publish listing' }).click();
await page.waitForSelector('.publish-success');
console.log('Sell flow: listing published');

await page.goto(base, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Ask Usell support' }).click();
await page.getByPlaceholder('Ask about Usell…').fill('How does delivery work?');
await page.getByRole('button', { name: 'Send message' }).click();
await page.waitForFunction(() => document.querySelectorAll('.chat-bubble').length >= 3);
console.log('Support:', (await page.locator('.chat-bubble--bot').last().innerText()).slice(0, 100));

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobilePage = await mobile.newPage();
mobilePage.on('pageerror', (error) => errors.push(`mobile page: ${error.message}`));
await mobilePage.goto(base, { waitUntil: 'networkidle' });
await mobilePage.screenshot({ path: 'usell-home-mobile.png', fullPage: false });
const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('Mobile horizontal overflow:', overflow);
await mobilePage.getByRole('button', { name: 'Open menu' }).click();
await mobilePage.waitForSelector('.mobile-drawer');
console.log('Mobile menu: opened');

const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const admin = await adminContext.newPage();
admin.on('pageerror', (error) => errors.push(`admin page: ${error.message}`));
await admin.goto(`${base}/auth`, { waitUntil: 'networkidle' });
await admin.getByRole('button', { name: 'Demo admin' }).click();
await admin.waitForURL(/admin/);
await admin.waitForSelector('.metric-grid');
console.log('Admin metrics:', await admin.locator('.metric-card').count());
await admin.getByRole('button', { name: 'WhatsApp report' }).click();
await admin.waitForSelector('.report-preview');
console.log('WhatsApp report preview:', (await admin.locator('.report-preview').innerText()).slice(0, 70));
await admin.screenshot({ path: 'usell-admin-report.png', fullPage: false });

console.log('Errors:', JSON.stringify(errors, null, 2));
await browser.close();
if (errors.length) process.exitCode = 1;
