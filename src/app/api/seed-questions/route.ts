import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { textChunk, diagramUrl, topicCode } = await request.json();

    const systemPrompt = `You are a UK GCSE/KS3 exam question parser.
Extract the question and return ONLY valid JSON (no markdown, no preamble).
Format: {
  "questionText": "LaTeX string using KaTeX syntax",
  "questionType": "numeric|algebraic|multichoice|coordinate",
  "correctAnswer": "string",
  "markScheme": "LaTeX string",
  "difficulty": 1|2|3,
  "source": "paper reference if visible"
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is not set' }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [
            { text: systemPrompt },
            { text: `Topic: ${topicCode}\n\nQuestion text:\n${textChunk}` },
            ...(diagramUrl ? [{ text: `Diagram URL: ${diagramUrl}` }] : [])
          ]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json({ error: 'Gemini API call failed', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return NextResponse.json({ error: 'Invalid response from Gemini API', data }, { status: 500 });
    }
    
    try {
      const cleanJsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      return NextResponse.json({ error: 'Parse failed', raw }, { status: 422 });
    }
  } catch (error: any) {
    console.error('Error in seed-questions endpoint:', error);
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 });
  }
}
