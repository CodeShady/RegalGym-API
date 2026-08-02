import express, { type Request, type Response } from "express";
import { extractClasses } from "./classes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(["/", "/api"], (_req: Request, res: Response) => {
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

app.post(["/api/v1/classes/", "/api/v1/classes", "/v1/classes/", "/v1/classes"], async (req: Request, res: Response) => {
  const { iframe } = req.body;

  if (!iframe?.trim()) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const iframeData = await fetch(iframe).then((r) => r.text());

  const srcUrlMatch = iframeData.match(/<script\b[^>]*\bsrc=(['"])([^'"]*)\1/i);
  if (!srcUrlMatch) {
    return res.status(500).json({ message: "Unable to extract `src` attribute from <script> in iframe. Aborting." });
  }

  const srcUrl = srcUrlMatch[2];
  if (!srcUrl) {
    return res.status(500).json({ message: "`srcUrl` was undefined. Aborting." });
  }

  const srcData = await fetch(srcUrl).then((r) => r.text());
  const table = srcData.match(/<table[\s\S]*<\/table>/)?.[0];

  if (!table) {
    return res.status(500).json({ message: "Table HTML data could not be extracted. Aborting." });
  }

  const classJson = extractClasses(table);

  return res.status(200).json({
    message: "OK",
    data: classJson,
  });
});

export default app;
