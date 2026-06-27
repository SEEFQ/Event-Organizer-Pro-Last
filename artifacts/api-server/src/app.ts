import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", router);

// In production (Docker / Render) the built React app is served as static files.
// Set STATIC_DIR to the path of the Vite build output (artifacts/event-hub/dist/public).
const staticDir = process.env["STATIC_DIR"]
  ? path.resolve(process.env["STATIC_DIR"])  // normalise to absolute path
  : null;
if (staticDir) {
  app.use(express.static(staticDir));
  // SPA fallback: any non-API GET that doesn't match a real file → index.html.
  // Using { root } so sendFile always receives a relative filename over an
  // absolute base, which is the form Express accepts unambiguously.
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      res.sendFile("index.html", { root: staticDir });
    } else {
      next();
    }
  });
}

export default app;
