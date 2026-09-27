import puppeteer from "puppeteer-core";
const [url, out, width = "1440", height = "900"] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const p = await b.newPage();
await p.setViewport({ width: +width, height: +height, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
// scroll through so every section's reveal fires
const h = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += Math.floor(+height * 0.6)) { await p.evaluate((y) => window.scrollTo(0, y), y); await new Promise(r => setTimeout(r, 350)); }
await new Promise(r => setTimeout(r, 6000));
await p.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: out, fullPage: true });
await b.close();
