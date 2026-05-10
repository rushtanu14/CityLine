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

async function assertNoVisibleNextDevIndicator(page, label) {
  const indicator = await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    if (!portal) return { visible: false, text: "" };

    const style = window.getComputedStyle(portal);
    const rect = portal.getBoundingClientRect();
    return {
      visible:
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0.05 &&
        rect.width > 1 &&
        rect.height > 1,
      text: portal.textContent?.trim().slice(0, 120) ?? "",
    };
  });

  if (indicator.visible) {
    throw new Error(`${label} has a visible Next.js dev indicator or overlay: ${indicator.text}`);
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

async function waitForVisibleCanvasPixels(page, label) {
  let lastCheck = { ok: false, reason: "not sampled" };
  for (let index = 0; index < 40; index += 1) {
    lastCheck = await sampleCanvasPixels(page);
    if (lastCheck.ok) return lastCheck;
    await page.waitForTimeout(200);
  }

  throw new Error(`${label} canvas pixel check failed: ${lastCheck.reason}`);
}

async function scrollToProgress(page, progress) {
  await page.evaluate((targetProgress) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, maxScroll * targetProgress);
  }, progress);
}

async function verifyViewport(browser, name, viewport, deviceScaleFactor = 1) {
  const contextOptions =
    name === "mobile"
      ? { ...devices["iPhone 14"], viewport, deviceScaleFactor }
      : { viewport, deviceScaleFactor };
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await assertNoVisibleNextDevIndicator(page, `${name} initial`);
  await waitForCanvas(page, name);
  await waitForVisibleCanvasPixels(page, `${name} initial`);

  for (const [stop, progress] of scrollStops) {
    await scrollToProgress(page, progress);
    await page.waitForTimeout(900);
    await waitForVisibleCanvasPixels(page, `${name} ${stop}`);
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
      timeout: 60000,
    });
  }

  await context.close();
  return { name };
}

async function waitForLoaderToClear(page) {
  const loader = page.locator(".city-loader");
  const loaderCount = await loader.count();
  if (loaderCount === 0) {
    throw new Error("loader was not rendered on initial app load");
  }

  for (let index = 0; index < 50; index += 1) {
    const hasLoader = await page.evaluate(() => Boolean(document.querySelector(".city-loader")));
    if (!hasLoader) return;
    await page.waitForTimeout(100);
  }

  throw new Error("loader did not clear within 5 seconds");
}

async function waitForHash(page, hash) {
  await page.waitForFunction((expectedHash) => window.location.hash === expectedHash, hash, { timeout: 5000 });
}

async function waitForScrollToSettle(page) {
  let previous = await page.evaluate(() => window.scrollY);
  let stableFrames = 0;

  for (let index = 0; index < 50; index += 1) {
    await page.waitForTimeout(100);
    const current = await page.evaluate(() => window.scrollY);
    if (Math.abs(current - previous) < 0.5) {
      stableFrames += 1;
    } else {
      stableFrames = 0;
      previous = current;
    }

    if (stableFrames >= 4) return;
  }

  throw new Error("scroll did not settle after anchor navigation");
}

async function assertVisible(locator, label) {
  await locator.waitFor({ state: "visible", timeout: 7000 }).catch((error) => {
    throw new Error(`${label} was not visible: ${error.message}`);
  });
}

async function assertStoryPanelAppears(page) {
  for (const progress of [0.16, 0.2, 0.24, 0.32, 0.4]) {
    await scrollToProgress(page, progress);
    await page.waitForTimeout(900);
    const visiblePanel = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".story-panel")).some((panel) => {
        const style = window.getComputedStyle(panel);
        const rect = panel.getBoundingClientRect();
        return (
          style.visibility !== "hidden" &&
          Number.parseFloat(style.opacity || "0") > 0.25 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight
        );
      }),
    );

    if (visiblePanel) return;
  }

  throw new Error("no story panel became visible across the story scroll range");
}

async function verifyFeatureSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];

  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console error: ${message.text()}`);
  });

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await waitForLoaderToClear(page);
    await assertNoVisibleNextDevIndicator(page, "feature smoke initial");
    await waitForCanvas(page, "feature smoke");
    await waitForVisibleCanvasPixels(page, "feature smoke initial");

    await assertVisible(page.getByRole("heading", { name: "CityLine Flood Run" }), "hero headline");
    await assertVisible(page.getByText("Flash flood warning / South Street Seaport"), "hero warning copy");

    await waitForVisibleCanvasPixels(page, "feature smoke");

    const initialParallax = await page.locator("main").evaluate((element) => getComputedStyle(element).getPropertyValue("--mx"));
    await page.mouse.move(1240, 160);
    await page.waitForTimeout(160);
    const movedParallax = await page.locator("main").evaluate((element) => getComputedStyle(element).getPropertyValue("--mx"));
    if (initialParallax === movedParallax) {
      throw new Error("pointer parallax variables did not update after mouse movement");
    }

    await page.locator('.site-nav a[href="#story"]').click();
    await waitForHash(page, "#story");
    await waitForScrollToSettle(page);
    await assertStoryPanelAppears(page);

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await waitForLoaderToClear(page);
    await assertNoVisibleNextDevIndicator(page, "feature smoke reload");
    await waitForCanvas(page, "feature smoke reload");
    await waitForVisibleCanvasPixels(page, "feature smoke reload");

    await page.locator('.hero-actions a[href="#command"]').click();
    await waitForHash(page, "#command");
    await waitForScrollToSettle(page);
    await assertVisible(page.getByRole("heading", { name: "Change the variables. Watch the escape path breathe." }), "command heading");
    await page.waitForTimeout(1400);

    for (const neighborhood of ["Red Hook Waterfront", "Long Island City", "South Street Seaport"]) {
      const neighborhoodButton = page.locator(".neighborhood-list button", { hasText: neighborhood });
      await neighborhoodButton.click();
      await assertVisible(page.locator(".subject-card strong", { hasText: neighborhood }), `selected neighborhood ${neighborhood}`);
      const isPressed = await neighborhoodButton.getAttribute("aria-pressed");
      if (isPressed !== "true") {
        throw new Error(`selected neighborhood ${neighborhood} did not expose active button state`);
      }
    }

    const beforePlayback = await page.locator(".simulator-status strong").nth(2).innerText();
    await page.getByRole("button", { name: "Play flood rise" }).click();
    await assertVisible(page.getByRole("button", { name: "Pause flood rise" }), "pause playback button");
    await page.waitForFunction(
      (previousText) => {
        const metric = document.querySelectorAll(".simulator-status strong")[2];
        return metric?.textContent !== previousText;
      },
      beforePlayback,
      { timeout: 3500 },
    );
    await page.getByRole("button", { name: "Pause flood rise" }).click();
    await assertVisible(page.getByRole("button", { name: "Play flood rise" }), "playback button after pause");

    await page.locator('.site-nav a[href="#layers"]').click();
    await waitForHash(page, "#layers");
    await waitForScrollToSettle(page);
    for (const hazard of ["Flood surge", "Wildfire smoke", "Earthquake grid", "Heat / air"]) {
      await assertVisible(page.locator(".layer-card", { hasText: hazard }), `hazard layer ${hazard}`);
    }

    await page.screenshot({ path: "artifacts/cityline-feature-smoke.png", fullPage: false, timeout: 60000 });

    if (browserErrors.length > 0) {
      throw new Error(`browser errors during feature smoke:\n${browserErrors.join("\n")}`);
    }
  } finally {
    await context.close();
  }

  return {
    name: "features",
    details: "loader, hero, nav anchors, simulator controls, playback, parallax, and hazard cards",
  };
}

async function verifyLocalhostAlias(browser) {
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.hostname !== "localhost") {
    return null;
  }

  const aliasUrl = `${parsedUrl.protocol}//127.0.0.1:${parsedUrl.port || (parsedUrl.protocol === "https:" ? "443" : "80")}${parsedUrl.pathname}`;
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];

  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console error: ${message.text()}`);
  });

  try {
    await page.goto(aliasUrl, { waitUntil: "domcontentloaded" });
    await waitForLoaderToClear(page);
    await assertNoVisibleNextDevIndicator(page, "127.0.0.1 alias");
    await waitForCanvas(page, "127.0.0.1 alias");
    await waitForVisibleCanvasPixels(page, "127.0.0.1 alias");

    if (browserErrors.length > 0) {
      throw new Error(`browser errors during 127.0.0.1 alias check:\n${browserErrors.join("\n")}`);
    }
  } finally {
    await context.close();
  }

  return {
    name: "dev alias",
    details: "127.0.0.1 hydrates, clears loader, and renders WebGL without dev overlays",
  };
}

async function main() {
  await fs.mkdir("artifacts", { recursive: true });
  const browser = await chromium.launch();
  try {
    const results = [];
    results.push(await verifyFeatureSmoke(browser));
    const aliasResult = await verifyLocalhostAlias(browser);
    if (aliasResult) results.push(aliasResult);
    results.push(await verifyViewport(browser, "desktop", { width: 1440, height: 980 }, 1));
    results.push(await verifyViewport(browser, "mobile", { width: 390, height: 844 }, 2));
    console.log("CityLine verification passed:");
    for (const result of results) {
      console.log(`- ${result.name}: ${result.details ?? "R3F canvas visible across scroll stops"}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
