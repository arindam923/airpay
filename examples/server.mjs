import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.STATIC_PORT ?? 4312);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function resolvePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = normalize(join(ROOT, decoded));
  if (!target.startsWith(ROOT.endsWith(sep) ? ROOT : `${ROOT}${sep}`)) return null;
  return target;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname === "/") {
    res.writeHead(302, { location: "/browser/index.html" });
    return res.end();
  }

  const filePath = resolvePath(url.pathname);
  if (!filePath) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    return res.end(body);
  } catch {
    res.writeHead(404);
    return res.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Example server listening on http://127.0.0.1:${PORT}/browser/index.html`);
});
