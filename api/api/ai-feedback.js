// api/ai-feedback.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { taskType, questionText, answerKey, studentAnswer } = req.body || {};
  if (!taskType || !questionText || !studentAnswer) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // 객관식은 서버에서 1차 자동 채점 (정답키가 A~E일 때)
  if (taskType === "mcq" && /^[A-E]$/i.test(String(answerKey||"").trim())) {
    const a = String(answerKey).trim().toUpperCase();
    const s = String(studentAnswer).trim().toUpperCase();
    const correct = a === s;
    // 해설은 아래 LLM에서 생성
  }

  // JSON 형식 강제 시스템 프롬프트
  const system = `You are a grader for Korean CSAT English.
Return STRICT JSON:
{
  "taskType": "mcq|short|writing",
  "score": {"value": number, "max": number},
  "verdict": string,
  "corrections": string[],
  "explanation": string,
  "nextSteps": string[]
}
Keep it concise; use CSAT-style reasoning.`;

  const maxMap = { mcq: 1, short: 5, writing: 9 };
  const scoreMax = maxMap[taskType] ?? 5;

  const user = `
[Task]: ${taskType}
[ScoreMax]: ${scoreMax}
[Question]:
${questionText}

[OfficialAnswer](optional):
${answerKey || "(none)"}

[StudentAnswer]:
${studentAnswer}
  `.trim();

  try {
    // OpenAI 호출 (다른 LLM으로 바꾸려면 여기만 교체)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: "LLM upstream error", detail: t });
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { parsed = { taskType, score: { value: 0, max: scoreMax }, verdict: "Parsing failed", corrections: [], explanation: "", nextSteps: [] }; }

    // 안전 보정
    if (!parsed?.score?.max) parsed.score = { value: Number(parsed?.score?.value||0), max: scoreMax };
    parsed.score.value = Math.max(0, Math.min(Number(parsed.score.value || 0), Number(parsed.score.max)));
    parsed.taskType = parsed.taskType || taskType;
    parsed.corrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
    parsed.nextSteps = Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [];

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e) });
  }
}
