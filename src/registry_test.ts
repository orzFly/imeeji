import { assertEquals } from "@std/assert";
import { parseWwwAuthenticate } from "./integrations/ociRegistry.ts";

Deno.test("parseWwwAuthenticate - parses standard Bearer challenge", () => {
  const header =
    'Bearer realm="https://auth.example.com/token",service="registry.example.com",scope="repository:foo/bar:pull"';
  const result = parseWwwAuthenticate(header);
  assertEquals(result, {
    realm: "https://auth.example.com/token",
    service: "registry.example.com",
    scope: "repository:foo/bar:pull",
  });
});

Deno.test("parseWwwAuthenticate - returns null for non-Bearer auth", () => {
  assertEquals(parseWwwAuthenticate('Basic realm="test"'), null);
  assertEquals(parseWwwAuthenticate("Bearer"), null);
  assertEquals(parseWwwAuthenticate(""), null);
});

Deno.test("parseWwwAuthenticate - handles realm-only challenge", () => {
  const header = 'Bearer realm="https://auth.example.com/token"';
  const result = parseWwwAuthenticate(header);
  assertEquals(result, {
    realm: "https://auth.example.com/token",
  });
});

Deno.test("parseWwwAuthenticate - case-insensitive scheme", () => {
  const header = 'bearer realm="https://auth.example.com/token",service="r.io"';
  assertEquals(
    parseWwwAuthenticate(header)?.realm,
    "https://auth.example.com/token",
  );
  assertEquals(parseWwwAuthenticate(header)?.service, "r.io");

  const upper = 'BEARER realm="https://auth.example.com/token"';
  assertEquals(
    parseWwwAuthenticate(upper)?.realm,
    "https://auth.example.com/token",
  );
});
