import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY_2 || "";
const ai = new GoogleGenAI({ apiKey: apiKey });

async function generateWithBackoff(aiInstance: any, payload: any, retries = 3, delay = 2000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await aiInstance.models.generateContent(payload);
    } catch (error: any) {
      const errString = JSON.stringify(error) || "";
      const is503 = errString.includes("503") || error?.status === 503 || error?.message?.includes("503");
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

  try {
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error: Missing API Key" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const brandVoice = formData.get("brandVoice") || "";
    const userTitle = formData.get("userTitle") || "";
    const userName = formData.get("userName") || "";
    const postGoal = formData.get("postGoal") || "I want them to feel inspired";

    const promptText = `
      You are Content Multiplier, an elite personal brand architect and multi-platform distribution growth strategist.
      The copy you write must be stripped of all fluff—as simple as possible, but not simpler.

      User Profile Context:
      - Name: ${userName}
      - Industry/Title: ${userTitle}
      - Content Strategy Goal: ${postGoal}
      - Core Writing Voice Guide: ${brandVoice}

      ---
      STRICT WRITING LAWS:
      - Absolutely NO robotic AI boilerplate or generic introductory sentences. 
      - Write with intense human rhythm, clean formatting, short lines, and heavy psychological weight.

      Generate the complete distribution campaign structured EXACTLY into the following markdown headers:

      ---
      [LINKEDIN DISTRIBUTION]
      Generate EXACTLY 3 entirely distinct, independent, standalone text-based authority posts. Each post must be a complete, self-contained universe from hook to CTA.

      ---
      [INSTAGRAM DISTRIBUTION]
      Provide exactly 2 high-leverage visual strategies:
      1. REEL CONCEPT STRATEGY (Visual Hook, Video Script, The Strategic Why)
      2. CAROUSEL INFOGRAPHIC BLUEPRINT (10-slide sequence breakdown)

      ---
      [X POST DISTRIBUTION]
      Generate EXACTLY 10 entirely standalone, separate direct posts optimized for X. Do NOT build connected threads. Options 1-5 must be under 280 characters. Options 6-10 must be premium long-form direct posts.

      Ensure the division lines "---" and brackets match perfectly so the frontend app splits the cards beautifully.
    `;

    const contentsPayload: any[] = [];

    if (file && file.size > 0 && file.name) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const tempDir = "/tmp"; 
      
      const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
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

      const base64Data = buffer.toString("base64");

      contentsPayload.push({
        inlineData: {
          data: base64Data,
          mimeType: finalMimeType
        }
      });

      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        tempFilePath = "";
      }
    }

    contentsPayload.push(promptText);

    const response = await generateWithBackoff(ai, {
      model: "gemini-2.5-flash",
      contents: contentsPayload
    });

    return NextResponse.json({ content: response.text || "" }, { status: 200 });

  } catch (error: any) {
    console.error("Production Core Engine Failure:", error);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }

    const errorMsg = error?.message || "";
    let printableMessage = "The processing clusters are heavily populated right now. Please press process again in a few seconds.";
    
    if (errorMsg.includes("503")) {
      printableMessage = "The AI engine is facing massive peak demand spikes. Let's tap process again to clear the queue.";
    } else if (errorMsg.length > 0 && !errorMsg.includes("{")) {
      printableMessage = errorMsg;
    }

    return NextResponse.json({ error: printableMessage }, { status: 500 });
  }
}