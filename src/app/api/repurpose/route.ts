import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import os from "os";

const apiKey = process.env.GEMINI_API_KEY_2 || "";
const ai = new GoogleGenAI({ apiKey: apiKey });

async function generateContentWithRetry(aiInstance: any, payload: any, retries = 3, delay = 2000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await aiInstance.models.generateContent(payload);
    } catch (error: any) {
      const is503 = error?.message?.includes("503") || error?.status === 503 || JSON.stringify(error).includes("503");
      if (is503 && i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}

export async function POST(request: Request) {
  let tempFilePath = "";
  let fileName = "";
  let uploadResult: any = null;

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    const safeFileName = `${Date.now()}_clean_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    tempFilePath = path.join(tempDir, safeFileName);
    
    fs.writeFileSync(tempFilePath, buffer);

    let finalMimeType = file.type;
    if (!finalMimeType || finalMimeType === "audio/x-wav" || finalMimeType.includes("octet-stream")) {
      if (file.name.endsWith(".wav")) finalMimeType = "audio/wav";
      else if (file.name.endsWith(".mp3")) finalMimeType = "audio/mp3";
      else if (file.name.endsWith(".m4a")) finalMimeType = "audio/m4a";
      else if (file.name.endsWith(".mp4")) finalMimeType = "video/mp4";
      else finalMimeType = "audio/wav";
    }

    uploadResult = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType: finalMimeType }
    } as any);

    fileName = uploadResult.name;

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      tempFilePath = "";
    }

    let fileState = uploadResult.state || "PROCESSING";
    let attempts = 0;
    while (fileState === "PROCESSING" && attempts < 15) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const checkStatus = await ai.files.get({ name: fileName });
      fileState = checkStatus.state;
      attempts++;
      if (fileState === "FAILED") {
        throw new Error("Media processing failed on the cloud backend engine.");
      }
    }

    const prompt = `
        You are Content Multiplier, an elite personal brand architect and multi-platform distribution growth strategist building world-class content for high-tier professionals, builders, and leaders across all industries. 
      The copy you write must be stripped of all fluff—as simple as possible, but not simpler. It must feel so premium and human that users instantly see why this platform is worth a premium subscription.

      User Profile Context:
      - Name: ${userName}
      - Industry/Title: ${userTitle}
      - Content Strategy Goal: ${postGoal}
      - Core Writing Voice Guide: ${brandVoice}

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

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash", 
      contents: [
        {
          fileData: {
            fileUri: uploadResult.uri,
            mimeType: uploadResult.mimeType
          }
        },
        prompt
      ]
    });

    if (fileName) {
      await ai.files.delete({ name: fileName });
      fileName = "";
    }

    return NextResponse.json({ content: response.text }, { status: 200 });

  } catch (error: any) {
    console.error("Production Core Engine Failure:", error);
    
    
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
    if (ai && fileName) {
      try { await ai.files.delete({ name: fileName }); } catch (_) {}
    }

    const readableErrorMessage = error?.message?.includes("503") 
      ? "The processing clusters are heavily populated right now. Please press process again in a few seconds." 
      : error.message || "An unexpected error occurred during processing.";

    return NextResponse.json({ error: readableErrorMessage }, { status: 500 });
  }
}