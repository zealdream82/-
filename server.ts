import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, userMessage } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "API key is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
        당신은 '밀접(Mealjeop)' 서비스의 친절하고 전문적인 고객 지원 챗봇입니다.
        
        [서비스 소개]
        - 밀접은 식당, 편의점, 구내식당 등에서 식사 후 바로 나에게 맞는 맞춤형 영양제를 즉석에서 조제해주는 키오스크 서비스입니다.
        - 사놓고 안 먹는 영양제나 늘 챙겨다녀야 하는 개별 포장 영양제의 불편함을 해소합니다.
        
        [가격 정보]
        - 1회분 맞춤 조제 기본 가격은 250원이며, 선택하는 영양 성분(수면, 활력, 소화 등) 1개당 300원이 추가됩니다.
        - 예: 성분 1개 선택 시 550원, 2개 선택 시 850원, 3개 선택 시 1,150원.
        
        [이벤트 및 혜택]
        - 사전 알림 신청: 내 주변에 밀접 키오스크가 생기면 알려주는 알림을 신청하면, 해당 지역 서비스 개시 후 '3일치 맞춤 영양제 이용권'을 제공합니다.
        - 식당 추천: 밀접 키오스크 설치를 원하는 식당을 추천해주시면, 추첨을 통해 '1주일치 맞춤 영양제 이용권'을 드립니다.
        
        [답변 가이드라인]
        - 항상 친절하고 공손한 한국어(존댓말)로 답변하세요.
        - 질문에 대해 명확하고 간결하게 답변하세요.
        - 서비스와 관련 없는 질문에는 "죄송하지만 밀접 서비스와 관련된 질문에만 답변해 드릴 수 있습니다."라고 정중히 거절하세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...messages.map((m: any) => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
