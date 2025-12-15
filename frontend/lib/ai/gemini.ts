// Gemini AI integration for PlantDoctor
// Primary AI for image analysis and chat

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const GEMINI_VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"
const GEMINI_CHAT_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"

export interface GeminiResponse {
  success: boolean
  text?: string
  error?: string
}

export async function analyzeImageWithGemini(imageBase64: string, prompt: string): Promise<GeminiResponse> {
  try {
    if (!GEMINI_API_KEY) {
      return { success: false, error: "Gemini API key not configured" }
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.includes("base64,") ? imageBase64.split("base64,")[1] : imageBase64

    const response = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Gemini API error:", errorData)
      return { success: false, error: errorData.error?.message || "Gemini API failed" }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return { success: false, error: "No response from Gemini" }
    }

    return { success: true, text }
  } catch (error) {
    console.error("[v0] Gemini image analysis error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function chatWithGemini(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt?: string,
): Promise<GeminiResponse> {
  try {
    if (!GEMINI_API_KEY) {
      return { success: false, error: "Gemini API key not configured" }
    }

    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }))

    // Add system instruction if provided
    const systemInstruction = systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined

    const response = await fetch(`${GEMINI_CHAT_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Gemini chat error:", errorData)
      return { success: false, error: errorData.error?.message || "Gemini chat failed" }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return { success: false, error: "No response from Gemini" }
    }

    return { success: true, text }
  } catch (error) {
    console.error("[v0] Gemini chat error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
