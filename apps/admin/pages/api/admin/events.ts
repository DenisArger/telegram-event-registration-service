import type { NextApiRequest, NextApiResponse } from "next";

function getApiBase(): string {
  return String(process.env.ADMIN_API_BASE_URL ?? "").trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method ?? "")) {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    res.status(500).json({ message: "ADMIN_API_BASE_URL is not configured" });
    return;
  }

  const search = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(req.query ?? {})) {
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) search.append(key, String(value));
    } else if (rawValue != null) {
      search.set(key, String(rawValue));
    }
  }
  const url = `${apiBase}/api/admin/events${search.toString() ? `?${search.toString()}` : ""}`;

  try {
    const upstream = await fetch(url, {
      method: String(req.method),
      headers: {
        "content-type": "application/json",
        cookie: String(req.headers.cookie ?? "")
      },
      body: req.method === "GET" ? undefined : JSON.stringify(req.body ?? {})
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }

    const text = await upstream.text();
    res.status(upstream.status);
    if (text) {
      try {
        res.json(JSON.parse(text));
      } catch {
        res.send(text);
      }
      return;
    }
    res.end();
  } catch {
    res.status(502).json({ message: "Failed to reach admin API" });
  }
}
