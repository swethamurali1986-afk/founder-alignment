import { getStore } from "@netlify/blobs";

const founderIds = ["F1", "F2", "F3", "F4"];
const teamPattern = /^[a-z0-9-]{6,48}$/i;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export default async (request) => {
  try {
    const store = getStore("founder-alignment");
    const url = new URL(request.url);

    if (request.method === "GET") {
      const teamId = url.searchParams.get("team") || "";
      if (!teamPattern.test(teamId)) return json({ error: "Invalid team ID" }, 400);

      const records = await Promise.all(founderIds.map((id) => store.get(`${teamId}/${id}`, { type: "json" })));
      return json({
        founders: Object.fromEntries(founderIds.flatMap((id, index) => records[index] ? [[id, records[index]]] : [])),
      });
    }

    if (request.method === "PUT") {
      const rawBody = await request.text();
      if (rawBody.length > 500000) return json({ error: "Payload too large" }, 413);

      let body;
      try {
        body = JSON.parse(rawBody || "{}");
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      if (!teamPattern.test(body.teamId || "")) return json({ error: "Invalid team ID" }, 400);
      const entries = Object.entries(body.founders || {}).filter(([id]) => founderIds.includes(id));
      if (!entries.length) return json({ error: "No founder records supplied" }, 400);

      await Promise.all(entries.map(([id, founder]) => store.setJSON(`${body.teamId}/${id}`, founder)));
      return json({ saved: entries.map(([id]) => id) });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("Alignment function failed", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected function error" }, 500);
  }
};
