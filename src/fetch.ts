export async function myFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
    ? input.toString()
    : input.url;
  const method = init?.method ?? "GET";

  console.error(`[fetch] ${method} ${url}`);
  const start = performance.now();

  const response = await fetch(input, init);

  const duration = Math.round(performance.now() - start);
  console.error(`[fetch] ${url} -> ${response.status} (${duration}ms)`);

  return response;
}
