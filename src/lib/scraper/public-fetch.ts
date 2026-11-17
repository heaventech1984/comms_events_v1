import dns from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";
import type { FetchLike } from "./live-adapter";
import { validatePublicImportUrl } from "./allowlist";
import { FETCH_BODY_MAX } from "./harvest";

export function pinnedLookup(address: { address: string; family: number }) {
  return (_hostname: string, options: unknown, callback: (...args: unknown[]) => void) => {
    const all = typeof options === "object" && options !== null && "all" in options && options.all === true;
    if (all) callback(null, [address]);
    else callback(null, address.address, address.family);
  };
}

function isPublicIp(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || (a === 203 && b === 0));
  }
  if (isIP(address) === 6) {
    const ip = address.toLowerCase();
    return ip.startsWith("2") || ip.startsWith("3"); // Global unicast 2000::/3 only.
  }
  return false;
}

/** HTTPS request with DNS pinning, bounded redirects, and a capped response body. */
export const fetchPublicPage: FetchLike = async (input, init) => {
  let url = input;
  for (let hop = 0; hop <= 3; hop += 1) {
    const checked = validatePublicImportUrl(url);
    if (!checked.ok) throw new Error("Unsafe destination.");
    const addresses = await Promise.race([
      dns.lookup(checked.url.hostname, { all: true, verbatim: true }),
      new Promise<never>((_resolve, reject) => {
        if (init?.signal?.aborted) reject(Object.assign(new Error("Timed out."), { name: "AbortError" }));
        else init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Timed out."), { name: "AbortError" })), { once: true });
      })
    ]);
    if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) throw new Error("Unsafe destination.");
    const address = addresses[0];
    const response = await new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
      const request = https.request(checked.url, {
        method: "GET",
        headers: init?.headers,
        servername: checked.url.hostname,
        lookup: pinnedLookup(address) as never,
        signal: init?.signal
      }, (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > FETCH_BODY_MAX) request.destroy(new Error("Response too large."));
          else chunks.push(chunk);
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
      });
      request.setTimeout(15000, () => request.destroy(Object.assign(new Error("Timed out."), { name: "AbortError" })));
      request.on("error", reject);
      request.end();
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (hop === 3 || !location || Array.isArray(location)) throw new Error("Too many redirects.");
      url = new URL(location, checked.url).toString();
      continue;
    }
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      headers: { get: (name) => {
        const value = response.headers[name.toLowerCase()];
        return Array.isArray(value) ? value.join(", ") : value ?? null;
      } },
      text: async () => response.body
    };
  }
  throw new Error("Too many redirects.");
};
