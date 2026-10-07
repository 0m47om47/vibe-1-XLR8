const express = require("express");
const cookieParser = require("cookie-parser");
const { corsAndCsrf } = require("./middleware/cors");
const { errorHandler } = require("./lib/http");

const authRoutes = require("./routes/auth");
const requestRoutes = require("./routes/requests");
const tripRoutes = require("./routes/trips");
const historyRoutes = require("./routes/history");
const dashboardRoutes = require("./routes/dashboard");
const metaRoutes = require("./routes/meta");
const healthRoutes = require("./routes/health");

const app = express();

// This server is API-only; never advertise the framework.
app.disable("x-powered-by");

app.use(cookieParser());
app.use(express.json());

// CORS + CSRF defence for every /api request (see middleware/cors.js).
app.use("/api", corsAndCsrf);

app.get("/", (req, res) => {
  res.json({ ok: true, data: { service: "Lawazia Toto Ride Management API", docs: "See README.md", health: "/api/health" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/health", healthRoutes);

// Unmatched /api/* routes → a consistent 404 JSON response.
app.use("/api", (req, res) => {
  res.status(404).set("Cache-Control", "no-store").json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } });
});

// Must be registered last: catches errors thrown or passed to next() by any route above.
app.use(errorHandler);

module.exports = app;
