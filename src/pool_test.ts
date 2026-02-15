import { assertEquals } from "@std/assert";
import { mapPool } from "./pool.ts";

Deno.test("mapPool - respects concurrency limit", async () => {
  let maxConcurrent = 0;
  let current = 0;

  const results = await mapPool([1, 2, 3, 4, 5, 6], 3, async (n) => {
    current++;
    maxConcurrent = Math.max(maxConcurrent, current);
    await new Promise((r) => setTimeout(r, 10));
    current--;
    return n * 2;
  });

  assertEquals(maxConcurrent, 3);
  assertEquals(results, [2, 4, 6, 8, 10, 12]);
});

Deno.test("mapPool - returns empty array for empty input", async () => {
  const results = await mapPool([], 5, async (n: number) => {
    await Promise.resolve();
    return n;
  });
  assertEquals(results, []);
});

Deno.test("mapPool - preserves result order", async () => {
  const items = [100, 50, 150, 25, 75];
  const results = await mapPool(items, 2, async (delay) => {
    await new Promise((r) => setTimeout(r, delay));
    return delay;
  });
  assertEquals(results, items);
});
