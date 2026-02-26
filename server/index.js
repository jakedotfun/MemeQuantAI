import "dotenv/config";
import express from "express";
import cors from "cors";

import walletRoutes from "./routes/wallet.js";
import tradeRoutes from "./routes/trade.js";
import automationRoutes from "./routes/automation.js";
import portfolioRoutes from "./routes/portfolio.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

// Routes
app.use("/api/wallet", walletRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/portfolio", portfolioRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`MemeQuant server running on http://localhost:${PORT}`);
});
