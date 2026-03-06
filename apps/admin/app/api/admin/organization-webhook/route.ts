import { NextResponse, type NextRequest } from "next/server";

function getApiBase(): string {
  return String(process.env.ADMIN_API_BASE_URL ?? "").trim();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json({ message: "ADMIN_API_BASE_URL is not configured" }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${apiBase}/api/admin/organization-webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: String(req.headers.get("cookie") ?? "")
      },
      body: await req.text()
    });

    const text = await upstream.text();
    const response = new NextResponse(text || null, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json"
      }
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch {
    return NextResponse.json({ message: "Failed to reach admin API" }, { status: 502 });
  }
}
