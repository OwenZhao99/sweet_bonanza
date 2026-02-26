import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  getPaytable,
  getTargetRtp,
  getVolatility,
  setRtpMultiplier,
  setVolatility,
  type VolatilityLevel,
} from "../client/src/lib/gameEngine";
import { handleSpinRequest } from "./api/spinHandler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // JSON API for math engine
  app.post("/api/v1/spin", (req, res) => {
    try {
      const result = handleSpinRequest(req.body ?? {});
      res.json(result);
    } catch (err) {
      // Basic error shaping for now
      const message =
        err instanceof Error ? err.message : "Unknown error while processing spin request";
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/v1/paytable", (_req, res) => {
    res.json(getPaytable());
  });

  app.get("/api/v1/config", (_req, res) => {
    res.json({
      rtp: getTargetRtp(),
      volatility: getVolatility(),
    });
  });

  app.post("/api/v1/config", (req, res) => {
    const body = req.body ?? {};
    const { rtp, volatility } = body as {
      rtp?: unknown;
      volatility?: unknown;
    };

    if (typeof rtp === "number" && Number.isFinite(rtp) && rtp > 0) {
      setRtpMultiplier(rtp);
    }
    if (typeof volatility === "string") {
      setVolatility(volatility as VolatilityLevel);
    }

    res.json({
      rtp: getTargetRtp(),
      volatility: getVolatility(),
    });
  });

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
