import { NextResponse } from "next/server";

export const runtime = "nodejs";

function extractText(payload: any): string {
  if (!payload?.output || !Array.isArray(payload.output)) return "";

  return payload.output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter((part: any) => part?.type === "output_text" && typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}

function parseJsonText(text: string) {
  const cleaned = text
    .replace(/^\`\`\`json\s*/i, "")
    .replace(/^\`\`\`\s*/i, "")
    .replace(/\s*\`\`\`$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

async function createResponse(instructions: string, input: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions,
      input,
      max_output_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return extractText(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "organize") {
      const note = String(body.note || "").trim();
      const source = String(body.source || "Other");
      const project = String(body.project || "");

      if (!note) {
        return NextResponse.json({ error: "A note is required." }, { status: 400 });
      }

      const text = await createResponse(
        [
          "You are Codexiary, a personal developer journal assistant.",
          "Turn rough notes into a factual structured memory.",
          "Do not invent achievements, tools, outcomes, people, dates, or lessons that are not supported by the note.",
          "Return ONLY valid JSON. No markdown fences.",
          'Schema: {"summary":"string","category":"Building|Learning|AI & Engineering|Career|Leadership","topics":["string"],"lesson":"string","angle":"string","hook":"string"}',
          "summary should preserve the concrete event in <= 220 characters.",
          "topics should contain 1-5 useful technical or professional topics.",
          "lesson should be a concise takeaway grounded in the note; if no lesson is explicit, phrase it cautiously as an observation rather than a certainty.",
          "angle should describe a useful public story angle without exaggeration.",
          "hook should sound human, specific, and thoughtful. Avoid 'thrilled to announce', hype, and excessive punctuation.",
        ].join(" "),
        `Source: ${source}\nProject/course: ${project || "Not specified"}\nRaw note:\n${note}`,
      );

      const result = parseJsonText(text);

      return NextResponse.json({
        result: {
          summary: String(result.summary || note.slice(0, 180)),
          category: String(result.category || "Learning"),
          topics: Array.isArray(result.topics)
            ? result.topics.map(String).slice(0, 5)
            : [source],
          lesson: String(result.lesson || ""),
          angle: String(result.angle || ""),
          hook: String(result.hook || ""),
        },
      });
    }

    if (body.action === "draft") {
      const entry = body.entry;
      const tone = String(body.tone || "Reflective");

      if (!entry?.raw) {
        return NextResponse.json({ error: "An entry is required." }, { status: 400 });
      }

      const content = await createResponse(
        [
          "You are helping one developer turn a private work-and-learning journal into an authentic LinkedIn draft.",
          "Use only facts contained in the supplied journal entry.",
          "Never invent metrics, impact, job responsibilities, technologies, events, or outcomes.",
          "Write in first person.",
          "Voice: thoughtful, technically curious, grounded, concise, not corporate.",
          "Avoid 'I am thrilled', 'excited to announce', fake vulnerability, motivational clichés, and emoji-heavy writing.",
          "Prefer short readable paragraphs.",
          "Make the post useful to another developer or student, not merely an announcement.",
          "Do not mention that AI wrote the draft.",
          "Use at most 2 relevant hashtags, and omit hashtags if they add no value.",
          "Return the post text only.",
        ].join(" "),
        [
          `Tone: ${tone}`,
          `Category: ${entry.category || ""}`,
          `Project/course: ${entry.project || ""}`,
          `Source: ${entry.source || ""}`,
          `Suggested angle: ${entry.angle || ""}`,
          `Suggested hook: ${entry.hook || ""}`,
          `Journal note: ${entry.raw}`,
          `Recorded lesson: ${entry.lesson || ""}`,
        ].join("\n"),
      );

      return NextResponse.json({ result: { content } });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    const missingKey = message.includes("OPENAI_API_KEY");

    return NextResponse.json(
      {
        error: missingKey
          ? "AI is not configured. Codexiary will use its local fallback."
          : "AI request failed. Codexiary will use its local fallback.",
      },
      { status: missingKey ? 503 : 500 },
    );
  }
}
