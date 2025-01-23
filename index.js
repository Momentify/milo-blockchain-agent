import helmet from "helmet";
import express from "express";
import cors from "cors";
import { logger } from "./src/utils/log.js";
import { getVersion } from "./src/utils/version.js";

// controllers
import * as cdp from "./src/controllers/cdp.js";
import bodyParser from "body-parser";

// server declaration
const app = express();

// Async Error Handler
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// server middlewares
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Set Listening Port
const PORT = process.env.PORT || 3000;

app.get("/health", async (req, res) => {
  logger.info("health check endpoint accessed", { req, res });
  res.status(200).json({
    Status: "Healthy",
    About: "Momentify Milo Blockchain Agent Service",
    Version: await getVersion(),
  });
});

app.post("/chat", asyncHandler(cdp.ChatAgentKit));


app.use((err, req, res, next) => {
  logger.error(`Error caught by the server - ${err}`, { req, res, error: err });
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server listening at ${PORT}`);
});
