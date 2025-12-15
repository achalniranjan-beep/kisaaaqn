import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

// Language mapping for Indian languages
const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  mr: "Marathi (मराठी)",
  gu: "Gujarati (ગુજરાતી)",
  bn: "Bengali (বাংলা)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  or: "Odia (ଓଡ଼ିଆ)",
  as: "Assamese (অসমীয়া)",
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, query, language = "en" } = body

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 })
    }

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Check for OpenRouter API key
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your environment variables.",
        },
        { status: 500 },
      )
    }

    // Extract base64 data and mime type from data URL
    const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    const languageName = LANGUAGE_MAP[language] || "English"
    const prompt = `${query}

Please provide a detailed analysis for farmers, including:
1. Disease/Problem identification (if any)
2. Possible causes
3. Recommended treatments and solutions
4. Prevention tips
5. Additional advice

CRITICAL: Respond ENTIRELY in ${languageName}. Every single word must be in ${languageName}. Do NOT mix languages. Do NOT use English if another language is specified.`

    // Use OpenRouter API with vision model
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://kisaan-mitra.app',
        'X-Title': 'Kisaan Mitra AI',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Analyze Image] OpenRouter error:', response.status, errorText)
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    const analysis = data.choices?.[0]?.message?.content || 'Unable to analyze the image'

    return NextResponse.json({
      success: true,
      analysis,
      query,
      language,
      languageName,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error("[v0] Error analyzing image:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
