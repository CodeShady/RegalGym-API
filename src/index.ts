import express, { type Request, type Response } from "express";
import { extractClasses } from "./classes.js";
import { getCached, setCached } from "./cache.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  res.send(`<pre>Hello from the Regal API! 🤸
    
⣿⣿⣿⣿⠏⠌⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⠀⠀⠸⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⠃⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⡿⠃⠀⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⠃⠀⠀⣾⣿⣿⣿⣿⣿⣦⠀⠈⠻⣿⣿⣿⣿
⣿⠀⠀⠀⣿⣿⣿⠟⠉⠉⠉⢃⣤⠀⠈⢿⣿⣿
⣿⠀⠀⠀⢸⣿⡟⠀⠀⠀⠀⢹⣿⣧⠀⠀⠙⣿
⣿⡆⠀⠀⠈⠻⡅⠀⠀⠀⠀⣸⣿⠿⠇⠀⠀⢸
⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠔⠛⠁⠀⠀⠀⣠⣿
⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿
⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿
⣿⣿⡇         ⣠⣿⣿⣿⣿⣿⣿
⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿
⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⣿⣿
⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿
⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿</pre>`);
});

app.post("/api/v1/classes", async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const { iframe } = req.body;

  if (!iframe?.trim()) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  // Lookup cache
  const cached = getCached(iframe);
  if (cached) {
    return res.status(200).json({
      message: "OK",
      data: cached,
    });
  }

  const iframeData = await fetch(iframe).then((r) => r.text());

  const srcUrlMatch = iframeData.match(/<script\b[^>]*\bsrc=(['"])([^'"]*)\1/i);
  if (!srcUrlMatch) {
    return res.status(500).json({ message: "Unable to extract `src` attribute from <script> in iframe. Aborting." });
  }

  let srcUrl: URL;
  try {
    srcUrl = new URL(srcUrlMatch[2]);
    srcUrl.searchParams.delete("hidecols");
  } catch {
    return res.status(500).json({ message: "Parsing `srcUrl` errored. Aborting." });
  }

  const srcData = await fetch(srcUrl.href).then((r) => r.text());
  const table = srcData.match(/<table[\s\S]*<\/table>/)?.[0];

  if (!table) {
    return res.status(500).json({ message: "Table HTML data could not be extracted. Aborting." });
  }

  const classJson = extractClasses(table);

  // Update cache
  setCached(iframe, classJson);

  return res.status(200).json({
    message: "OK",
    data: classJson,
  });
});

app.get("/api/v1/healthz", (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Only listen on server if NOT running on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Running server on http://localhost:${PORT}`);
  });
}

export default app;