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
    const {
      message,
      previousInteractionId
    } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const requestBody = {
      model: "gemini-3.8-flash",
      input: message.trim(),
      system_instruction:
        "You are Tony AI, a friendly, intelligent and helpful assistant. " +
        "Give clear, accurate and natural answers. " +
        "Remember the conversation context provided by previous interactions.",
      stream: true,
      store: true
    };

    if (
      typeof previousInteractionId === "string" &&
      previousInteractionId.length > 0
    ) {
      requestBody.previous_interaction_id =
        previousInteractionId;
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
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Gemini API error:",
        response.status,
        details
      );

      return res.status(502).json({
        error: "Tony could not connect to Gemini.",
        details
      });
    }

    if (!response.body) {
      return res.status(502).json({
        error: "No response stream received."
      });
    }

    res.setHeader(
      "Content-Type",
      "text/event-stream; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      res.write(
        decoder.decode(value, { stream: true })
      );

      if (typeof res.flush === "function") {
        res.flush();
      }
    }

    const remaining = decoder.decode();

    if (remaining) {
      res.write(remaining);
    }

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