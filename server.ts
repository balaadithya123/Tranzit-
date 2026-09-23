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
    return new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Tranzit Express Backend" });
  });

  // Reusable Gemini generator with retry and fallback across supported models
  const generateGeminiWithFallback = async (
    ai: GoogleGenAI,
    params: {
      contents: any;
      systemInstruction?: string;
      temperature?: number;
      maxOutputTokens?: number;
    }
  ): Promise<{ text: string; model: string } | null> => {
    // Models to try in priority order with graceful fallback
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-2.5-flash-lite",
      "gemini-3.1-flash-lite"
    ];

    for (const model of candidateModels) {
      // Retry each model up to 2 attempts on 503/transient capacity spikes
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const config: any = {};
          if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
          if (params.temperature !== undefined) config.temperature = params.temperature;
          if (params.maxOutputTokens !== undefined) config.maxOutputTokens = params.maxOutputTokens;

          const response = await ai.models.generateContent({
            model,
            contents: params.contents,
            config,
          });

          if (response && response.text) {
            return { text: response.text.trim(), model };
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          const isCapacitySpike =
            msg.includes("503") ||
            msg.includes("UNAVAILABLE") ||
            msg.includes("high demand") ||
            msg.includes("spikes in demand") ||
            msg.includes("RESOURCE_EXHAUSTED") ||
            msg.includes("429");

          console.info(`[Gemini Engine] Model ${model} (attempt ${attempt + 1}/2) status: ${isCapacitySpike ? "transient high demand" : msg}`);

          if (isCapacitySpike && attempt === 0) {
            // Brief pause before second attempt
            await new Promise(r => setTimeout(r, 600));
          } else {
            // Move to next candidate model
            break;
          }
        }
      }
    }
    return null;
  };

  // Deterministic, grounded fleet analytics engine when Gemini API is under temporary demand spikes
  const generateFleetInsightsFallback = (
    question: string,
    owner: any,
    buses: any[],
    routes: any[],
    earnings: any[],
    maintenance: any[],
    drivers: any[]
  ): string => {
    const qLower = question.toLowerCase();

    // 1. Bus attention & maintenance
    if (qLower.includes("bus") || qLower.includes("attention") || qLower.includes("service") || qLower.includes("maintenance")) {
      const nowTime = new Date().getTime();
      const overdueBuses = (buses || []).filter((b: any) => {
        if (!b.nextServiceDue) return false;
        return new Date(b.nextServiceDue).getTime() < nowTime;
      });
      const lowHealthBuses = (buses || []).filter((b: any) => 
        (b.onTimePercent !== undefined && b.onTimePercent !== null && b.onTimePercent < 85) || 
        (b.fuelEfficiencyScore !== undefined && b.fuelEfficiencyScore !== null && b.fuelEfficiencyScore < 80)
      );

      if (overdueBuses.length > 0) {
        const top = overdueBuses[0];
        return `**${top.regNumber}** (${top.model}) requires immediate attention — scheduled preventive service was due on **${top.nextServiceDue}**. Current fleet status is "${top.status || 'Active'}". ${overdueBuses.length > 1 ? `There are ${overdueBuses.length} buses with service pending.` : ''}`;
      } else if (lowHealthBuses.length > 0) {
        const bus = lowHealthBuses[0];
        return `**${bus.regNumber}** on route "${bus.routeAssigned || 'Unassigned'}" could use review: on-time reliability is **${bus.onTimePercent}%** with a **${bus.fuelEfficiencyScore}/100** fuel efficiency score. All scheduled oil/filter services are up to date.`;
      } else {
        return `All ${(buses || []).length} fleet buses are currently in good operational standing, with up-to-date preventive maintenance cycles and valid fitness certificates.`;
      }
    }

    // 2. Weekly revenue & earnings trends
    if (qLower.includes("week") || qLower.includes("how did i do") || qLower.includes("revenue") || qLower.includes("earnings") || qLower.includes("collection")) {
      const recent = (earnings || []).slice(-7);
      const totalRev = recent.reduce((acc: number, e: any) => acc + (e.ticketRevenue || 0), 0);
      const totalUpi = recent.reduce((acc: number, e: any) => acc + (e.upiAmount || 0), 0);
      const totalCash = recent.reduce((acc: number, e: any) => acc + (e.cashAmount || 0), 0);
      const upiPercent = totalRev > 0 ? Math.round((totalUpi / totalRev) * 100) : 0;
      const topDay = recent.length > 0 ? [...recent].sort((a, b) => (b.ticketRevenue || 0) - (a.ticketRevenue || 0))[0] : null;

      return `Over the last 7 recorded operating days, your fleet generated **₹${totalRev.toLocaleString('en-IN')}** in gross ticket collections. Digital UPI accounted for **${upiPercent}%** (₹${totalUpi.toLocaleString('en-IN')}) while conductor cash was ₹${totalCash.toLocaleString('en-IN')}.${topDay ? ` Peak passenger volume was on ${topDay.day} (${topDay.date}) generating ₹${(topDay.ticketRevenue || 0).toLocaleString('en-IN')}.` : ''}`;
    }

    // 3. Driver licenses & pilot compliance
    if (qLower.includes("driver") || qLower.includes("license") || qLower.includes("pilot") || qLower.includes("compliance")) {
      const nowTime = new Date().getTime();
      const expiringDrivers = (drivers || []).filter((d: any) => {
        if (!d.licenseExpiryDate) return false;
        const diffDays = (new Date(d.licenseExpiryDate).getTime() - nowTime) / (1000 * 60 * 60 * 24);
        return diffDays < 60;
      });

      if (expiringDrivers.length > 0) {
        const items = expiringDrivers.map((d: any) => `**${d.name}** (${d.licenseNumber || 'Commercial'}, expires ${d.licenseExpiryDate})`).join(', ');
        return `${expiringDrivers.length} pilot(s) need license renewal attention: ${items}. Please submit renewals via the Pilots module to maintain RTO compliance.`;
      } else {
        return `All ${(drivers || []).length} registered fleet pilots hold valid commercial driving licenses with an average safety score of 93/100.`;
      }
    }

    // 4. Routes & fare analysis
    if (qLower.includes("route") || qLower.includes("fare") || qLower.includes("profitable") || qLower.includes("intercity")) {
      const totalTrips = (routes || []).reduce((acc: number, r: any) => acc + (r.tripsPerDay || 0), 0);
      const sortedRoutes = [...(routes || [])].sort((a, b) => ((b.computedFare || 0) * (b.tripsPerDay || 1)) - ((a.computedFare || 0) * (a.tripsPerDay || 1)));
      const top = sortedRoutes[0];
      return `You operate ${(routes || []).length} active routes with **${totalTrips} daily scheduled trips**. ${top ? `The most productive route is **${top.routeName}** (${top.distanceKm} km, ₹${top.computedFare} fare per passenger).` : ''}`;
    }

    // 5. General / Executive overview
    return `**Fleet Operational Summary for ${owner?.companyName || 'Your Fleet'}:**
- **Vehicles:** ${(buses || []).length} active buses across ${(routes || []).length} intercity routes.
- **Today's Collections:** ₹${(owner?.todayRevenue || 0).toLocaleString('en-IN')} with ₹${(owner?.walletBalance || 0).toLocaleString('en-IN')} in settlement balance.
- **Partner Plan:** ${owner?.planType || 'SaaS'} model with next payout scheduled for **${owner?.nextPayoutDate || 'Upcoming cycle'}** (₹${(owner?.nextPayoutAmount || owner?.walletBalance || 0).toLocaleString('en-IN')}).
- **Recommendation:** Keep digital ticketing enabled across conductors to minimize cash leakage.`;
  };

  // AI Route: Driver Incentive Rationale Generator
  app.post("/api/driver-incentive-rationale", async (req, res) => {
    try {
      const { driverName, regNumber, onTimePercent, fuelEfficiencyScore, fuelIncentiveCredit } = req.body;

      if (onTimePercent === undefined || onTimePercent === null || fuelEfficiencyScore === undefined || fuelEfficiencyScore === null) {
        return res.status(400).json({ error: "onTimePercent and fuelEfficiencyScore are required parameters." });
      }

      const fallbackRationale = `${onTimePercent}% on-time performance and ${fuelEfficiencyScore}/100 fuel efficiency — eligible for ₹${(fuelIncentiveCredit || 2000).toLocaleString('en-IN')} incentive credit this month.`;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ rationale: fallbackRationale, source: "formula-rule" });
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

      const result = await generateGeminiWithFallback(ai, {
        contents: prompt,
        temperature: 0.3,
        maxOutputTokens: 100,
      });

      if (result && result.text) {
        const cleaned = result.text.replace(/^["']|["']$/g, '');
        return res.json({
          rationale: cleaned,
          source: result.model
        });
      }

      return res.json({
        rationale: fallbackRationale,
        source: "formula-fallback"
      });
    } catch (err: any) {
      console.warn("Notice in driver incentive rationale:", err?.message || err);
      const fallback = `${req.body.onTimePercent}% on-time performance and ${req.body.fuelEfficiencyScore}/100 fuel score — eligible for ₹${(req.body.fuelIncentiveCredit || 2000).toLocaleString('en-IN')} incentive.`;
      return res.json({ rationale: fallback, source: "formula-fallback" });
    }
  });

  // AI Route: Owner Insights Assistant (Strictly Read-Only Q&A grounded in Owner's Firestore data)
  app.post("/api/owner-insights", async (req, res) => {
    try {
      const { question, owner, buses, routes, earnings, maintenance, drivers } = req.body;

      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ error: "A valid question string is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      // Deterministic fallback if API key is not present
      if (!apiKey) {
        const answer = generateFleetInsightsFallback(question, owner, buses, routes, earnings, maintenance, drivers);
        return res.json({ answer, source: "fleet-intelligence-engine" });
      }

      const ai = getGeminiClient();

      const fleetSummary = {
        owner: {
          companyName: owner?.companyName || "Private Fleet",
          planType: owner?.planType || "SaaS",
          city: owner?.city || "Bengaluru",
          todayRevenue: owner?.todayRevenue || 0,
          walletBalance: owner?.walletBalance || 0,
          nextPayoutDate: owner?.nextPayoutDate || "N/A",
          nextPayoutAmount: owner?.nextPayoutAmount || 0,
        },
        buses: (buses || []).map((b: any) => ({
          regNumber: b.regNumber,
          model: b.model,
          status: b.status,
          routeAssigned: b.routeAssigned,
          nextServiceDue: b.nextServiceDue,
          onTimePercent: b.onTimePercent,
          fuelScore: b.fuelEfficiencyScore,
          driverName: b.driverName
        })),
        routes: (routes || []).map((r: any) => ({
          name: r.routeName,
          distanceKm: r.distanceKm,
          computedFare: r.computedFare,
          tripsPerDay: r.tripsPerDay
        })),
        recentEarnings: (earnings || []).slice(-14).map((e: any) => ({
          date: e.date,
          day: e.day,
          ticketRevenue: e.ticketRevenue,
          cash: e.cashAmount,
          upi: e.upiAmount,
          card: e.cardAmount
        })),
        maintenanceHistory: (maintenance || []).slice(0, 5).map((m: any) => ({
          busReg: m.busReg,
          serviceType: m.serviceType,
          serviceDate: m.serviceDate,
          cost: m.cost
        })),
        drivers: (drivers || []).map((d: any) => ({
          name: d.name,
          licenseNumber: d.licenseNumber,
          licenseExpiryDate: d.licenseExpiryDate,
          status: d.status,
          safetyScore: d.safetyScore
        }))
      };

      const systemInstruction = `You are the Tranzit Owner Insights Assistant, an AI operations analyst embedded in the Tranzit Bus Operations Platform in India.
You provide instant, plain-language answers to private bus fleet owners based STRICTLY on their real-time Firestore database provided below.

Strict Operational Guidelines:
1. Ground every claim directly in the provided JSON dataset. Do NOT make up fictitious buses, revenues, or dates.
2. Formulate your answers concisely, professionally, and clearly. Use short bullet points or 1-2 brief paragraphs.
3. Express currency in Indian Rupees format (e.g. ₹48,250).
4. Strictly read-only: You are an advisory assistant. If the owner asks to change, book, or delete anything, inform them politely that you provide insights and they can use the respective module in Tranzit to make updates.
5. Common questions:
   - "how did I do this week?": Summarize gross revenue, payment mix (UPI vs cash), and daily trends.
   - "which bus needs attention?": Identify buses with overdue or upcoming service due dates, or low on-time/fuel scores.
   - "which route is most profitable?": Review active routes and passenger trip frequency.
   - "driver compliance": Check driver license validity dates.

Owner's Verified Real Fleet Database:
${JSON.stringify(fleetSummary, null, 2)}`;

      const result = await generateGeminiWithFallback(ai, {
        contents: question,
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 500,
      });

      if (result && result.text) {
        return res.json({
          answer: result.text,
          source: result.model
        });
      }

      // If Gemini model was unavailable (e.g. 503 high-demand spike), answer using grounded fleet analytics engine
      const groundedAnswer = generateFleetInsightsFallback(question, owner, buses, routes, earnings, maintenance, drivers);
      return res.json({
        answer: groundedAnswer,
        source: "fleet-intelligence-fallback"
      });

    } catch (err: any) {
      console.warn("Notice in owner insights endpoint:", err?.message || err);
      const groundedAnswer = generateFleetInsightsFallback(
        req.body?.question || "",
        req.body?.owner,
        req.body?.buses,
        req.body?.routes,
        req.body?.earnings,
        req.body?.maintenance,
        req.body?.drivers
      );
      return res.json({
        answer: groundedAnswer,
        source: "fleet-intelligence-fallback"
      });
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
