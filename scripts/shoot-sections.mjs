import puppeteer from "puppeteer-core";
const [url, dir, ...ys] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
const h = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 500) { await p.evaluate((y) => window.scrollTo(0, y), y); await new Promise(r => setTimeout(r, 250)); }
await new Promise(r => setTimeout(r, 5000));
for (const y of ys) { await p.evaluate((y) => window.scrollTo(0, +y), y); await new Promise(r => setTimeout(r, 700)); await p.screenshot({ path: `${dir}/s-${y}.png` }); }
await b.close();
