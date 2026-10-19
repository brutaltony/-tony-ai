 export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured."
    });
  }
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: message,
          system_instruction:
            "You are Tony AI, a friendly and helpful assistant. Give clear, concise answers.",
          stream: true,
          store: false
        })
      }
    );
    if (!response.ok) {
      const details = await response.text();
      console.error("Gemini error:", response.status, details);
      return res.status(response.status).json({
        error: "Gemini API error",
        details
      });
    }
    if (!response.body) {
      return res.status(502).json({
        error: "No response stream received."
      });
    }
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
res.flush?.();
    }
    const remaining = decoder.decode();
    if (remaining) res.write(remaining);
    return res.end();
  } catch (error) {
    console.error("Tony AI error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Something went wrong. Please try again."
      });
    }
    return res.end();
  }
}
