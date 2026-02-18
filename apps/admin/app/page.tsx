async function getHealth(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_BOT_HEALTH_URL;
  if (!url) return "unknown (NEXT_PUBLIC_BOT_HEALTH_URL not set)";

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return `down (${response.status})`;
    return "ok";
  } catch {
    return "down (network error)";
  }
}

export default async function HomePage() {
  const health = await getHealth();

  return (
    <main>
      <h1>Event Registration Admin</h1>
      <p>Initial scaffold for internal events operations.</p>

      <section className="card">
        <h2>System Status</h2>
        <p>Bot API health: {health}</p>
      </section>
    </main>
  );
}
