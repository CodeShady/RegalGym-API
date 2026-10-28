import express, { type Request, type Response } from "express";
import { extractClasses } from "./classes.js";
import { getCached, setCached } from "./cache.js";
import * as cheerio from "cheerio";

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

  // Prevent SSRF vulnerability
  const allowedHosts = ["www-regalgym-com.filesusr.com", "app.jackrabbitclass.com"];
  const iframeUrl = new URL(iframe);

  if (!allowedHosts.includes(iframeUrl.hostname)) {
    console.log(iframeUrl.hostname);
    return res.status(400).json({
      message: "Domain prohibited"
    });
  }

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
  } else {
    // Payload value not supported
    return res.status(400).json({ message: "iframe value is not supported. Use either Jackrabbit middleman, direct Jackrabbit URL, or HTML code." });
  }

  // Fetch the registration page
  const response = await fetch(registrationPageURL);

  if (!response.ok) {
    return res.status(502).json({
      message: `Jackrabbit returned HTTP ${response.status}`,
    });
  }

  const srcData = await response.text();

  let html = srcData;

  // First, try parsing the response as regular HTML
  let $ = cheerio.load(html);

  if ($("table").length === 0) {
    // The table may be embedded in a JavaScript string.
    const contentMatch = srcData.match(
      /\bvar\s+content\s*=\s*("(?:\\.|[^"\\])*")\s*;/
    );

    if (contentMatch) {
      try {
        // Decode the JavaScript string literal, including escaped HTML.
        html = JSON.parse(contentMatch[1]);
        $ = cheerio.load(html);
      } catch {
        return res.status(502).json({
          message: "Unable to decode embedded HTML from Jackrabbit.",
        });
      }
    }
  }

  const table = $("table").first();

  if (table.length === 0) {
    return res.status(502).json({
      message: "No class table found in Jackrabbit response.",
    });
  }

  const classJson = extractClasses(table.toString());

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