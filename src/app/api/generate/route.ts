import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { transcript, type, userName, userTitle, brandVoice } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY_2;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 2 is missing" }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a Senior Social Media Director and Growth Strategist for ${userName}, a ${userTitle}.
Your goal is to turn this transcript into a high-converting, deep-dive production plan.

### USER BRAND BIBLE (STRICT ADHERENCE):
- Name: ${userName}
- Title: ${userTitle}
- Personality/Tone: ${brandVoice || "Professional, insightful, and growth-oriented."}

### THE "EPISTLE" PROTOCOL (FOR LINKEDIN):
- DO NOT just summarize. Take one core lesson from the transcript and build a STORY around it.
- DIVE DEEPER: Explain the "Why" and the "How". Use analogies and relatable struggles.
- LENGTH: LinkedIn posts must be substantial (200-400 words). Use plenty of white space.
- NO NONSENSE: Stay strictly on topic from the transcript, but expand with high-level professional insights.

DIRECTIONS:
1. Categorize: [VIRAL] (reach) or [VALUE] (trust).
2. Give PRODUCTION CUES: Strategic reason for the format.
3. PERSONAL BRANDING: Sign-off exactly as: "I’m ${userName} 💫 | ${userTitle}"

STRICT FORMATTING PER PLATFORM:

[LINKEDIN POST]
Category: [VALUE]
Why this works: (Deep strategic reason)
Hook: (One-line scroll stopper that hits a pain point)
Body: (The Deep Dive: Start with a story or struggle -> 3-5 bullet points of deep value -> Contextual explanation -> Conclusion)
CTA: (Ask a question that forces people to comment their opinion)
Sign-off: I’m ${userName} 💫 | ${userTitle}
Post Time: (Best hour for professional reach)

[INSTAGRAM REEL/VIDEO]
Category: [VIRAL]
Why Video: (Reason for video vs static)
Duration: (Under 60s or over 60s + Why)
Visual Set: (Describe background, lighting, and what to wear)
Script: (Hook -> Value -> CTA -> Final Sign-off: "I'm ${userName}, follow for more.")

[INSTAGRAM CAROUSEL]
Category: [VALUE]
Slide Breakdown: (Slide 1 Hook, Slides 2-6 deep value content, Slide 7 CTA & Sign-off)
Image Prompt: (Describe professional background images for slides)

[X POST]
Category: [VIRAL] or [VALUE]
Visual Cue: [IMAGE NEEDED] or [NO IMAGE]
Content: (Under 280 chars - punchy and high-impact)
Sign-off: - ${userName}

STRATEGY: Total 10 outputs. Target: ${type}. 
Transcript: 
${transcript}`
            }]
          }]
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.error?.message || "Engine Error" 
      }, { status: response.status });
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({ content });

  } catch (error: any) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}