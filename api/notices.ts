import type { IncomingMessage, ServerResponse } from "http";
import https from "https";

interface RawNotice {
  id: number;
  title: string;
  slug?: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  file?: string | null;
  created_at: string;
  type?: string;
}

export interface CleanNotice {
  id: number;
  title: string;
  slug?: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  file?: string | null;
  created_at: string;
  type?: string;
}

/**
 * Fetch raw notices array directly from BUBT's notice page.
 * BUBT embeds structured JSON in its server-rendered state.
 */
function fetchBubtNotices(): Promise<CleanNotice[]> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      "https://www.bubt.edu.bd/notice",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 10000,
      },
      (res) => {
        let html = "";
        res.on("data", (chunk) => {
          html += chunk;
        });
        res.on("end", () => {
          try {
            const match = html.match(/notices:\s*(\[[\s\S]*?\])\s*,/);
            if (!match || !match[1]) {
              return reject(new Error("Unable to parse notices payload from BUBT"));
            }

            const rawList: RawNotice[] = JSON.parse(match[1]);
            const cleaned: CleanNotice[] = rawList.slice(0, 60).map((n) => {
              let fileUrl: string | null = null;
              if (n.file) {
                fileUrl = n.file.startsWith("http")
                  ? n.file
                  : `https://www.bubt.edu.bd/storage/${n.file}`;
              } else if (n.slug) {
                fileUrl = `https://www.bubt.edu.bd/notice/${n.slug}`;
              }

              return {
                id: n.id,
                title: n.title,
                slug: n.slug,
                category: n.category
                  ? {
                      id: n.category.id,
                      name: n.category.name,
                      slug: n.category.slug,
                    }
                  : null,
                file: fileUrl,
                created_at: n.created_at,
                type: n.type || "office",
              };
            });

            resolve(cleaned);
          } catch (err: any) {
            reject(new Error(`Failed to parse BUBT notices: ${err.message}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("BUBT request timed out"));
    });
  });
}

// In-memory cache for edge runtime / serverless warm instances (10 minutes)
let cacheData: { timestamp: number; notices: CleanNotice[] } | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Cache-Control, Pragma"
  );

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Edge CDN cache: Cache for 30 minutes, allow stale for up to 1 day
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=1800, stale-while-revalidate=86400"
  );
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const now = Date.now();
  if (cacheData && now - cacheData.timestamp < CACHE_DURATION_MS) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        source: "cache",
        cachedAt: new Date(cacheData.timestamp).toISOString(),
        count: cacheData.notices.length,
        notices: cacheData.notices,
      })
    );
    return;
  }

  try {
    const notices = await fetchBubtNotices();
    cacheData = { timestamp: now, notices };

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        source: "live",
        fetchedAt: new Date(now).toISOString(),
        count: notices.length,
        notices,
      })
    );
  } catch (err: any) {
    // If live fetch fails but we have stale cache, serve stale cache
    if (cacheData) {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          success: true,
          source: "stale-cache",
          error: err.message,
          cachedAt: new Date(cacheData.timestamp).toISOString(),
          count: cacheData.notices.length,
          notices: cacheData.notices,
        })
      );
      return;
    }

    res.statusCode = 502;
    res.end(
      JSON.stringify({
        success: false,
        error: "Unable to retrieve notices from university portal at this time.",
        detail: err.message,
      })
    );
  }
}
