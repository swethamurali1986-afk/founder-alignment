import { getStore } from "@netlify/blobs";

const founderIds = ["F1", "F2", "F3", "F4"];
const teamPattern = /^[a-z0-9-]{6,48}$/i;

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  const store = getStore("founder-alignment");

  if (event.httpMethod === "GET") {
    const teamId = event.queryStringParameters?.team || "";
    if (!teamPattern.test(teamId)) return response(400, { error: "Invalid team ID" });

    const records = await Promise.all(founderIds.map((id) => store.get(`${teamId}/${id}`, { type: "json" })));
    return response(200, {
      founders: Object.fromEntries(founderIds.flatMap((id, index) => records[index] ? [[id, records[index]]] : [])),
    });
  }

  if (event.httpMethod === "PUT") {
    if ((event.body || "").length > 500000) return response(413, { error: "Payload too large" });
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid JSON" });
    }
    if (!teamPattern.test(body.teamId || "")) return response(400, { error: "Invalid team ID" });
    const entries = Object.entries(body.founders || {}).filter(([id]) => founderIds.includes(id));
    if (!entries.length) return response(400, { error: "No founder records supplied" });

    await Promise.all(entries.map(([id, founder]) => store.setJSON(`${body.teamId}/${id}`, founder)));
    return response(200, { saved: entries.map(([id]) => id) });
  }

  return response(405, { error: "Method not allowed" });
};
