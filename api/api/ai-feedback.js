// api/ai-feedback.js
// Vercel Serverless Function (No SDK, uses fetch)

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TIMEOUT_MS = 30000;
const MAX_TOKENS = 600;
const TEMPERATURE = 0.2;

function emptyResult() {
  return {
    score: { value: 0, max: 0 },
    verdict: "",
    corrections: [],
    explanation: "",
    nextSteps: [],
  };
}

function safeParseJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}

const SYSTEM = `
You are an English exam grader specialized in Korean CSAT (수능) English.
Return STRICT JSON only. No prose before/after JSON.
Language: Korean for feedback; use short English examples when needed.
JSON schema:
{
  "score": {"value": number, "max": number},
  "verdict": string,
  "corrections": string[],
  "explanation": string,
  "nextSteps": string[]
}
Rules:
- 객관식(mcq): answerKey 있으면 정오답. score=1/1 또는 0/1.
- 서술형(short): answerKey(키워드/문장) 대비 부분점수 허용(0~5).
- 에세이(writing): 0~9점(구성/논리/내용/언어).
- 간결한 근거. JSON만 출력.
`;

function buildUserPrompt({ taskType, questionText, answerKey, studentAnswer }) {
  const t = (taskType || "mcq").toLowerCase();
  const q = (questionText || "").trim();
  const a = (answerKey || "").trim();
  const s = (studentAnswer || "").trim();

  let rubric = "";
  if (t === "mcq") {
    rubric = `Task: Multiple Choice
Question+Options:
${q}

Official answerKey: ${a || "(없음; 최선의 정답 추론)"}
Student answer: ${s || "(무응답)"}

Score rule: correct=1/1, wrong=0/1.`;
  } else if (t === "short") {
    rubric = `Task: Short Answer
Question:
${q}

Reference answerKey (keywords/phrases or summary):
${a || "(없음; 핵심 요지로 자체 채점)"}

Student answer:
${s || "(무응답)"}

Score rule: 0~5 with partial credit.`;
  } else {
    rubric = `Task: Essay/Writing
Prompt:
${q}

Reference:
${a || "(없음)"}

Student answer:
${s || "(무응답)"}

Score rule: 0~9 (organization, logic, content, language).`;
  }

  return rubric + `

Return JSON ONLY (no markdown).`;
}

// simple timeout wrapper
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(v => { clearTimeout(id); resolve(v); })
           .catch(e => { clearTimeout(id); reject(e); });
  });
}

// (옵션) 헬스체크용 GET 핑
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, env: !!process.env.OPENAI_API_KEY, model: MODEL });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON body" }); }
  }

  const { taskType, questionText, answerKey, studentAnswer } = body || {};
  if (!questionText && !studentAnswer) {
    return res.status(400).json({ error: "Missing fields: questionText or studentAnswer" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  const user = buildUserPrompt({ taskType, questionText, answerKey, studentAnswer });

  try {
    const r = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user }
        ]
      })
    }), TIMEOUT_MS);

    if (!r.ok) {
      const detail = await r.text();
      const out = emptyResult();
      out.verdict = "피드백 실패";
      out.explanation = `LLM 응답 오류: ${detail.slice(0, 300)}`;
      return res.status(502).json(out);
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = safeParseJSON(content);
    if (!parsed) {
      const out = emptyResult();
      out.verdict = "응답 형식 오류(재시도)";
      out.explanation = "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.";
      return res.status(200).json(out);
    }

    const out = emptyResult();
    out.score = parsed.score || out.score;
    out.verdict = parsed.verdict || "";
    out.corrections = Array.isArray(parsed.corrections) ? parsed.corrections.slice(0,5) : [];
    out.explanation = parsed.explanation || "";
    out.nextSteps = Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0,3) : [];
    return res.status(200).json(out);

  } catch (err) {
    const out = emptyResult();
    if ((err?.message || "").includes("timeout")) {
      out.verdict = "시간 초과";
      out.explanation = "서버 응답이 지연되었습니다. 잠시 후 다시 시도하세요.";
      return res.status(504).json(out);
    }
    out.verdict = "피드백 실패";
    out.explanation = "일시적인 오류가 발생했습니다. 다시 시도하세요.";
    return res.status(500).json(out);
  }
}
