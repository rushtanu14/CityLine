import { useEffect, useState } from "react";

export type ScrollMetrics = {
  pageProgress: number;
  introProgress: number;
  commandActive: boolean;
  scrollY: number;
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export function useScrollProgress(): ScrollMetrics {
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    pageProgress: 0,
    introProgress: 0,
    commandActive: false,
    scrollY: 0,
  });

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const command = document.getElementById("command");
      const commandTop = command?.offsetTop ?? window.innerHeight * 4;
      const introEnd = Math.max(commandTop - window.innerHeight * 0.65, window.innerHeight);
      const commandActive = window.scrollY > commandTop - window.innerHeight * 0.18;

      setMetrics({
        pageProgress: clamp01(window.scrollY / maxScroll),
        introProgress: clamp01(window.scrollY / introEnd),
        commandActive,
        scrollY: window.scrollY,
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return metrics;
}
