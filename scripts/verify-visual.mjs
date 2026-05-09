import { chromium, devices } from "@playwright/test";
import fs from "node:fs/promises";

const baseUrl = process.env.CITYLINE_URL ?? "http://localhost:3000";
const scrollStops = [
  ["hero", 0],
  ["story-alert", 0.2],
  ["story-route", 0.48],
  ["command", 0.72],
  ["layers", 0.94],
];

async function sampleCanvasPixels(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return { ok: false, reason: "canvas not found", ratio: 0 };
    }

    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      return { ok: false, reason: "webgl context not available", ratio: 0 };
    }

    const sampleSize = 72;
    const regions = [
      [0.5, 0.5],
      [0.5, 0.28],
      [0.58, 0.34],
      [0.64, 0.42],
      [0.44, 0.3],
      [0.72, 0.26],
    ];

    let bestRatio = 0;
    for (const [px, py] of regions) {
      const x = Math.max(Math.floor(canvas.width * px - sampleSize / 2), 0);
      const y = Math.max(Math.floor(canvas.height * py - sampleSize / 2), 0);
      const pixels = new Uint8Array(sampleSize * sampleSize * 4);
      gl.readPixels(x, y, sampleSize, sampleSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let visible = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const intensity = pixels[i] + pixels[i + 1] + pixels[i + 2];
        if (pixels[i + 3] > 0 && intensity > 26) visible += 1;
      }

      bestRatio = Math.max(bestRatio, visible / (sampleSize * sampleSize));
    }

    return { ok: bestRatio > 0.035, reason: `visible ratio ${bestRatio.toFixed(3)}`, ratio: bestRatio };
  });
}

async function assertNoMajorOverlap(page, label, selectors) {
  const overlaps = await page.evaluate((inputSelectors) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const seen = new Set();
    const boxes = inputSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).flatMap((element, index) => {
        if (seen.has(element)) return [];
        seen.add(element);
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number.parseFloat(style.opacity || "1") > 0.08 &&
          rect.width > 1 &&
          rect.height > 1 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < viewportHeight &&
          rect.left < viewportWidth;

        if (!visible) return [];

        return [
          {
            id: `${selector}[${index}]`,
            left: Math.max(rect.left, 0),
            right: Math.min(rect.right, viewportWidth),
            top: Math.max(rect.top, 0),
            bottom: Math.min(rect.bottom, viewportHeight),
          },
        ];
      }),
    );

    const results = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const area = xOverlap * yOverlap;
        if (area > 1100) {
          results.push({ a: a.id, b: b.id, area: Math.round(area) });
        }
      }
    }
    return results;
  }, selectors);

  if (overlaps.length > 0) {
    throw new Error(`${label} overlap check failed: ${JSON.stringify(overlaps)}`);
  }
}

async function waitForCanvas(page, name) {
  const canvasLocator = page.locator("canvas");
  const start = Date.now();
  while ((await canvasLocator.count()) === 0) {
    if (Date.now() - start > 15000) {
      throw new Error(`${name} canvas not found`);
    }
    await page.waitForTimeout(100);
  }
}

async function scrollToProgress(page, progress) {
  await page.evaluate((targetProgress) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, maxScroll * targetProgress);
  }, progress);
}

async function verifyViewport(browser, name, viewport, deviceScaleFactor = 1) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    ...(name === "mobile" ? devices["iPhone 14"] : {}),
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await waitForCanvas(page, name);
  await page.waitForTimeout(1800);

  for (const [stop, progress] of scrollStops) {
    await scrollToProgress(page, progress);
    await page.waitForTimeout(900);
    const pixelCheck = await sampleCanvasPixels(page);
    if (!pixelCheck.ok) {
      throw new Error(`${name} ${stop} canvas pixel check failed: ${pixelCheck.reason}`);
    }
    await assertNoMajorOverlap(page, `${name} ${stop}`, [
      ".brand",
      ".site-nav nav",
      ".hero-copy",
      ".story-panel",
      ".command-heading",
      ".command-card",
      ".layer-card",
      ".resume-strip",
    ]);
    await page.screenshot({
      path: `artifacts/cityline-next-${name}-${stop}.png`,
      fullPage: false,
    });
  }

  await context.close();
  return { name };
}

async function main() {
  await fs.mkdir("artifacts", { recursive: true });
  const browser = await chromium.launch();
  try {
    const results = [];
    results.push(await verifyViewport(browser, "desktop", { width: 1440, height: 980 }, 1));
    results.push(await verifyViewport(browser, "mobile", { width: 390, height: 844 }, 2));
    console.log("Visual verification passed:");
    for (const result of results) {
      console.log(`- ${result.name}: R3F canvas visible across scroll stops`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
