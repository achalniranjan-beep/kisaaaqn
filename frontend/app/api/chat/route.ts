// app/api/chat/route.ts
// Chat API using OpenRouter (fallback from Gemini)

import { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `You are "Kisaan Mitra" (किसान मित्र) - a friendly, knowledgeable AI assistant dedicated to helping Indian farmers succeed.

Your expertise includes:
- Crop selection and profitable farming decisions
- Pest and disease identification and treatment
- Fertilizer and pesticide recommendations
- Weather-based farming advice
- Government schemes and subsidies for farmers (PM-KISAN, crop insurance, etc.)
- Solar-dried products and value addition opportunities
- Organic farming techniques
- Market prices and best selling practices
- Irrigation and water management
- Soil health and nutrient management

GUIDELINES:
1. Respond in the SAME LANGUAGE the user writes in. If they write in Hindi, respond in Hindi. If English, respond in English.
2. Support all Indian languages: Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Bengali, Punjabi, Odia, Assamese
3. Be warm, respectful, and use simple language farmers can understand
4. Give practical, actionable advice with step-by-step instructions
5. Include approximate costs when discussing products/inputs
6. Mention local/organic alternatives when available
7. Be encouraging and supportive - farming is hard work!
8. Use emojis occasionally to make conversations friendly: 🌾 🌱 🚜 💧 🌞

Remember: You are talking to hardworking farmers who feed the nation. Treat them with utmost respect and provide helpful, practical advice.`;

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error('[Chat API] OPENROUTER_API_KEY not found');
            return new Response(
                JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Chat API] Using OpenRouter with', messages.length, 'messages');

        // Format messages for OpenRouter (OpenAI-compatible format)
        const formattedMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((msg: { role: string; content: string }) => ({
                role: msg.role,
                content: msg.content,
            })),
        ];

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
                messages: formattedMessages,
                stream: true,
                max_tokens: 1024,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[Chat API] OpenRouter error:', response.status, errorData);
            return new Response(
                JSON.stringify({ error: `OpenRouter API error: ${response.status}` }),
                { status: response.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Stream the response
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readable = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;

                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.choices?.[0]?.delta?.content;
                                    if (content) {
                                        controller.enqueue(encoder.encode(content));
                                    }
                                } catch {
                                    // Skip invalid JSON
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('[Chat API] Stream error:', error);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('[Chat API] Error:', error?.message || error);
        return new Response(
            JSON.stringify({ error: error?.message || 'Failed to generate response' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
