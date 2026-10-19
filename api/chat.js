export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: message,
          system_instruction:
            "You are Tony AI, a friendly, helpful personal AI assistant. Give clear and useful answers.",
          store: false
        })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);
      return res.status(response.status).json({
        error: "Gemini API error",
        details: data
      });
    }
    const reply =
      data.output_text ||
      data.outputs?.map(item =>
        item.text || item.content?.map(part => part.text || "").join("") || ""
      ).join("\n") ||
      "I couldn't generate a reply.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Tony AI error:", error);
    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}