import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API client lazily or on route call
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({ apiKey: apiKey || "" });
  };

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Tranzit Express Backend" });
  });

  // AI Route: Driver Incentive Rationale Generator
  app.post("/api/driver-incentive-rationale", async (req, res) => {
    try {
      const { driverName, regNumber, onTimePercent, fuelEfficiencyScore, fuelIncentiveCredit } = req.body;

      if (!onTimePercent || !fuelEfficiencyScore) {
        return res.status(400).json({ error: "onTimePercent and fuelEfficiencyScore are required parameters." });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Fallback rationale if API key is not yet set by user
        const fallback = `${onTimePercent}% on-time performance and ${fuelEfficiencyScore}/100 fuel efficiency — eligible for ₹${(fuelIncentiveCredit || 2000).toLocaleString('en-IN')} incentive credit this month.`;
        return res.json({ rationale: fallback, source: "fallback" });
      }

      const ai = getGeminiClient();

      const prompt = `You are an AI fleet operations manager for Tranzit bus platform.
Turn these two performance numbers for driver ${driverName || 'Driver'} (Bus ${regNumber || ''}) into a short, concise, plain-language rationale for their fuel incentive credit:
- On-Time Performance: ${onTimePercent}%
- Fuel Efficiency Rating: ${fuelEfficiencyScore}/100
- Fuel Incentive Credit Amount: ₹${(fuelIncentiveCredit || 2000).toLocaleString('en-IN')}

Instructions:
- Output a single concise sentence explanation.
- Example format: "94% on-time and steady fuel efficiency — eligible for the full ₹2,000 credit this month."
- Keep it encouraging, professional, and clear.
- Return ONLY the single plain sentence string. Do NOT add quotes, bullet points, or markdown formatting.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 100,
        }
      });

      const rationaleText = response.text?.trim() || `${onTimePercent}% on-time and ${fuelEfficiencyScore}/100 fuel rating — eligible for ₹${(fuelIncentiveCredit || 2000).toLocaleString('en-IN')} credit this month.`;

      return res.json({
        rationale: rationaleText.replace(/^["']|["']$/g, ''),
        source: "gemini-live"
      });

    } catch (err: any) {
      console.error("Error generating driver incentive rationale with Gemini:", err);
      const fallback = `${req.body.onTimePercent}% on-time performance and ${req.body.fuelEfficiencyScore}/100 fuel score — eligible for ₹${(req.body.fuelIncentiveCredit || 2000).toLocaleString('en-IN')} incentive.`;
      return res.json({ rationale: fallback, source: "error-fallback" });
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
    console.log(`Tranzit Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
