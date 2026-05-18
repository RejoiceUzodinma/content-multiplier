import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import os from "os"; // Essential for cloud temp path resolution

const apiKey = process.env.GEMINI_API_KEY_2 || "";
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(request: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error: Missing API Key" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const brandVoice = formData.get("brandVoice") || "";
    const userTitle = formData.get("userTitle") || "";
    const userName = formData.get("userName") || "";
    const postGoal = formData.get("postGoal") || "I want them to feel inspired";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Cloud-Safe Temp Buffering using standard OS temp directory
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir(); // This is ALWAYS writable on Vercel/Cloud functions!
    
    // Create a safe, unique filename to prevent overwriting strings
    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const tempFilePath = path.join(tempDir, safeFileName);
    fs.writeFileSync(tempFilePath, buffer);

    // 2. Identify and explicitly verify the Mime Type (Handles mobile web recording edge cases)
    let finalMimeType = file.type;
    if (!finalMimeType || finalMimeType === "audio/x-wav" || finalMimeType.includes("octet-stream")) {
      if (file.name.endsWith(".wav")) finalMimeType = "audio/wav";
      else if (file.name.endsWith(".mp3")) finalMimeType = "audio/mp3";
      else if (file.name.endsWith(".m4a")) finalMimeType = "audio/m4a";
      else if (file.name.endsWith(".mp4")) finalMimeType = "video/mp4";
      else finalMimeType = "audio/wav"; // Default fallback match block
    }

    // 3. Upload file safely to Gemini Files API
    let uploadResult = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType: finalMimeType }
    } as any);

    // Clean up local cloud container storage immediately
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // 4. Polling Loop to wait until video/audio finishes processing
    let fileState = (uploadResult as any).state || "PROCESSING";
    const fileName = (uploadResult as any).name;

    while (fileState === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const checkStatus = await ai.files.get({ name: fileName });
      fileState = (checkStatus as any).state;
      if (fileState === "FAILED") {
        throw new Error("Google media processing failed on the cloud backend engine.");
      }
    }

    // 5. Ultimate Brand Architecture Content Prompt Blueprint
    const prompt = `
      You are Content Multiplier, an elite personal brand architect and multi-platform distribution growth strategist building world-class content for high-tier professionals, builders, and leaders across all industries. 
      The copy you write must be stripped of all fluff—as simple as possible, but not simpler. It must feel so premium and human that users instantly see why this platform is worth a premium subscription.

      User Profile Context:
      - Name: ${userName}
      - Industry/Title: ${userTitle}
      - Content Strategy Goal: ${postGoal}
      - Core Writing Voice Guide: ${brandVoice}

      ---
      STRICT WRITING LAWS:
      - Absolutely NO robotic AI boilerplate, generic introductory sentences, or summary "wallpaper text". 
      - Never use phrases like "In today's fast-paced digital era", "delve", "testament", "beacon", "moreover", or "let's dive in".
      - Write with intense human rhythm, clean formatting, short lines, and heavy psychological weight.

      Generate the complete distribution campaign structured EXACTLY into the following markdown headers:

      ---
      [LINKEDIN DISTRIBUTION]
      Generate EXACTLY 3 entirely distinct, independent, standalone text-based authority posts. 
      CRITICAL: These posts must NOT be a continuation of each other. Each post must be a complete, self-contained universe from hook to CTA.
      
      For EACH of the 3 posts, you must execute this psychological flow:
      1. THE HOOK: The first line is a do-or-die, high-retention statement. Open with a brutal industry truth, a profound contrarian take, a heavy mistake, or a high-stakes raw metric that stops the scroll in 2 seconds flat.
      2. BODY & VALUE: Break paragraphs into highly readable, single-sentence beats (1-2 sentences max per block). Write with absolute simplicity. Deliver immediate, un-diluted value or perspective based on the user's input.
      3. ULTRA-PREMIUM CTA: End with a hyper-specific, thought-provoking closing statement or a raw conversation-starting question. Do NOT use generic lines like "What do you think below?". Craft a unique, psychological prompt that forces engagement.

      ---
      [INSTAGRAM DISTRIBUTION]
      Provide exactly 2 high-leverage visual strategies:
      1. REEL CONCEPT STRATEGY:
         - Visual/Text Hook: The exact 3-second psychological on-screen text hook.
         - Video Script: High-retention talking points detailing exactly what to say to the camera.
         - The Strategic Why: Tactical explanation of why this style converts views to followers.
      2. CAROUSEL INFOGRAPHIC BLUEPRINT:
         - The Strategic Why: Explain the conversion psychology of this specific slide sequence.
         - Slide-by-Slide Layout: Provide specific copy instructions for an exact 10-slide sequence:
           - Slide 1: High-Click Title / Hook.
           - Slides 2-9: Sequential micro-lessons, step-by-step graphic layouts, and explicit visual copy.
           - Slide 10: Clear conversion CTA.

      ---
      [X POST DISTRIBUTION]
      Generate EXACTLY 10 entirely standalone, separate direct posts optimized for X (Twitter). Do NOT build connected threads. Each option must be a single, complete, premium post.
      - Options 1-5: Short, punchy, high-impact observations, power statements, or contrarian takes under 280 characters.
      - Options 6-10: Premium long-form direct posts leveraging whitespace, bulleted frameworks, and deep copy layout designs optimized for X Premium readers.

      Ensure the division lines "---" and brackets match perfectly so the frontend app splits the cards beautifully.
    `;
    // 6. Request Generation from Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        {
          fileData: {
            fileUri: (uploadResult as any).uri,
            mimeType: (uploadResult as any).mimeType
          }
        },
        prompt
      ]
    });

    // 7. Cleanup cloud platform files API space
    if (uploadResult && fileName) {
      await ai.files.delete({ name: fileName });
    }

    return NextResponse.json({ content: response.text }, { status: 200 });

  } catch (error: any) {
    console.error("Gemini Multiplier Production Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}