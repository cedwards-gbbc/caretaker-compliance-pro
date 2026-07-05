function normaliseWebsite(input: string) {
  const value = String(input || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function absoluteUrl(base: string, maybeUrl: string) {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
}

function findFirst(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

export async function discoverLogoUrl(websiteUrl: string) {
  const website = normaliseWebsite(websiteUrl);
  if (!website) return "";

  try {
    const res = await fetch(website, {
      headers: { "user-agent": "CaretakerCompliancePro/1.0" },
      cache: "no-store"
    });

    const html = await res.text();

    const found = findFirst(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i
    ]);

    if (found) return absoluteUrl(website, found);
  } catch {
    // Fall back to favicon.
  }

  try {
    const url = new URL(website);
    return `${url.origin}/favicon.ico`;
  } catch {
    return "";
  }
}

export function normaliseCompanyWebsite(input: string) {
  return normaliseWebsite(input);
}
