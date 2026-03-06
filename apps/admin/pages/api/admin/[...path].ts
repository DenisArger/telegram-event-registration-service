import type { NextApiRequest, NextApiResponse } from "next";

function getApiBase(): string {
  return String(process.env.ADMIN_API_BASE_URL ?? "").trim();
}

function buildUpstreamUrl(apiBase: string, path: string[], query: NextApiRequest["query"]): string {
  const search = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query ?? {})) {
    if (key === "path") continue;
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) search.append(key, String(value));
    } else if (rawValue != null) {
      search.set(key, String(rawValue));
    }
  }

  const normalizedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `${apiBase}/api/admin/${normalizedPath}${search.toString() ? `?${search.toString()}` : ""}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const method = String(req.method ?? "");
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    res.status(500).json({ message: "ADMIN_API_BASE_URL is not configured" });
    return;
  }

  const path = Array.isArray(req.query.path) ? req.query.path : [];
  if (path.length === 0) {
    res.status(400).json({ message: "Admin API path is required" });
    return;
  }

  try {
    const upstream = await fetch(buildUpstreamUrl(apiBase, path, req.query), {
      method,
      headers: {
        "content-type": "application/json",
        cookie: String(req.headers.cookie ?? "")
      },
      body: method === "GET" ? undefined : JSON.stringify(req.body ?? {})
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }

    const text = await upstream.text();
    res.status(upstream.status);
    if (!text) {
      res.end();
      return;
    }

    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch {
    res.status(502).json({ message: "Failed to reach admin API" });
  }
}
