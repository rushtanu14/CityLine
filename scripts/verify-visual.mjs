import { chromium, devices } from "@playwright/test";
import fs from "node:fs/promises";

const baseUrl = process.env.CITYLINE_URL ?? "http://127.0.0.1:5173";
const beatStops = [
  ["alert", 0.02],
  ["rainfall", 0.26],
  ["street-flood", 0.48],
  ["neighborhood", 0.68],
  ["route-act", 0.88],
];

async function sampleCanvasPixels(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas[data-cityline-canvas]");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return { ok: false, reason: "canvas not found", ratio: 0 };
    }

    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      return { ok: false, reason: "webgl context not available", ratio: 0 };
    }

    const sampleSize = 64;
    const x = Math.max(Math.floor(canvas.width / 2 - sampleSize / 2), 0);
    const y = Math.max(Math.floor(canvas.height / 2 - sampleSize / 2), 0);
    const pixels = new Uint8Array(sampleSize * sampleSize * 4);
    gl.readPixels(x, y, sampleSize, sampleSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let visible = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const intensity = pixels[i] + pixels[i + 1] + pixels[i + 2];
      if (pixels[i + 3] > 0 && intensity > 24) visible += 1;
    }

    const ratio = visible / (sampleSize * sampleSize);
    return { ok: ratio > 0.04, reason: `visible ratio ${ratio.toFixed(3)}`, ratio };
  });
}

async function getIntroScrollY(page, progress) {
  return page.evaluate((targetProgress) => {
    const command = document.getElementById("command");
    const commandTop = command?.offsetTop ?? window.innerHeight * 4;
    const introEnd = Math.max(commandTop - window.innerHeight * 0.65, window.innerHeight);
    return introEnd * targetProgress;
  }, progress);
}

async function assertNoMajorOverlap(page, label, selectors) {
  const overlaps = await page.evaluate((inputSelectors) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const boxes = inputSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).flatMap((element, index) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number.parseFloat(style.opacity || "1") > 0.05 &&
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
        if (area > 900) {
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

async function verifyViewport(browser, name, viewport, deviceScaleFactor = 1) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    ...(name === "mobile" ? devices["iPhone 14"] : {}),
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas[data-cityline-canvas]", { timeout: 10000 });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
  });
  await page.waitForTimeout(1400);
  const pixelCheck = await sampleCanvasPixels(page);

  await page.screenshot({
    path: `artifacts/cityline-${name}.png`,
    fullPage: false,
  });

  if (!pixelCheck.ok) {
    throw new Error(`${name} canvas pixel check failed: ${pixelCheck.reason}`);
  }

  for (const [beat, progress] of beatStops) {
    const scrollY = await getIntroScrollY(page, progress);
    await page.evaluate((targetY) => window.scrollTo(0, targetY), scrollY);
    await page.waitForTimeout(600);
    const beatCheck = await sampleCanvasPixels(page);
    if (!beatCheck.ok) {
      throw new Error(`${name} ${beat} canvas pixel check failed: ${beatCheck.reason}`);
    }
    await assertNoMajorOverlap(page, `${name} ${beat}`, [
      ".brand-lockup",
      ".topbar-actions",
      ".hero-overlay",
      ".story-monitor",
      ".intro-support",
      ".hazard-dock",
      ".resident-mobile-bar",
    ]);
    await page.screenshot({
      path: `artifacts/cityline-${name}-${beat}.png`,
      fullPage: false,
    });
  }

  if (name === "desktop") {
    await page.evaluate(() => {
      const command = document.getElementById("command");
      window.scrollTo(0, command?.offsetTop ?? document.body.scrollHeight);
    });
    await page.waitForTimeout(500);
    await assertNoMajorOverlap(page, "desktop command", [
      ".command-heading > div:first-child",
      ".source-strip",
      ".command-stepper",
      ".mode-grid",
      ".command-panel--primary",
      ".command-panel--route",
      ".command-panel--actions",
    ]);
    await page.screenshot({
      path: "artifacts/cityline-command.png",
      fullPage: false,
    });
  } else {
    await page.evaluate(() => {
      const command = document.getElementById("command");
      window.scrollTo(0, command?.offsetTop ?? document.body.scrollHeight);
    });
    await page.waitForTimeout(500);
    await assertNoMajorOverlap(page, "mobile command", [
      ".command-heading > div:first-child",
      ".source-strip",
      ".command-stepper",
      ".mode-grid",
      ".command-panel--primary",
      ".command-panel--route",
      ".command-panel--actions",
    ]);
    await page.screenshot({
      path: "artifacts/cityline-mobile-command.png",
      fullPage: false,
    });
  }

  await context.close();
  return { name, ratio: pixelCheck.ratio, scrolledRatio: pixelCheck.ratio };
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
      console.log(
        `- ${result.name}: center ratio ${result.ratio.toFixed(3)}, scrolled ${result.scrolledRatio.toFixed(3)}`,
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
