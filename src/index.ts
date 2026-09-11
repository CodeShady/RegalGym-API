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

  let iframe: string = req.body?.iframe?.trim();
  if (!iframe) {
    return res.status(400).json({ message: "Invalid iframe value" });
  }

  // Lookup cache
  const cached = getCached(iframe);
  if (cached) {
    return res.status(200).json({
      message: "OK",
      data: cached,
    });
  }

  let registrationPageURL: string;
  
  // Check what type of input this is (direct jackrabbit URL, middleman jackrabbit URL, direct HTML code?)
  if (iframe.startsWith("https://www-regalgym-com.filesusr.com")) {
    // Jackrabbit Middleman URL
    const iframeData = await fetch(iframe).then((r) => r.text());
  
    const srcUrlMatch = iframeData.match(/<script\b[^>]*\bsrc=(['"])([^'"]*)\1/i);
    if (!srcUrlMatch) {
      return res.status(500).json({ message: "Unable to extract `src` attribute from <script> in iframe. Aborting." });
    }
    
    let srcUrl = new URL(srcUrlMatch[2]);
    srcUrl.searchParams.delete("hidecols");
    registrationPageURL = srcUrl.href;
    
  } else if (iframe.startsWith("https://app.jackrabbitclass.com")) {
    // Direct Jackrabbit URL
    registrationPageURL = iframe;
  } else if (iframe.startsWith(`<script type="text/javascript"`)) {
    // HTML code
    return res.status(400).json({ message: "Direct HTML code is not supported at this time. Please use URLs." });
  } else {
    // Payload value not supported
    return res.status(400).json({ message: "iframe value is not supported. Use either Jackrabbit middleman, direct Jackrabbit URL, or HTML code." });
  }

  const srcData = await fetch(registrationPageURL).then((r) => r.text());
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