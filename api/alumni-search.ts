import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

interface DiscoveredAlumnus {
  id: string;
  full_name: string;
  department: string;
  intake?: number | null;
  passing_year?: number | null;
  designation?: string | null;
  company?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  source: string;
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const dept = (parsedUrl.searchParams.get('dept') || 'all').toLowerCase();
    const query = (parsedUrl.searchParams.get('q') || '').toLowerCase();

    // 1. Load pre-indexed multi-department alumni directory
    let localDirectory: DiscoveredAlumnus[] = [];
    try {
      const filePath = path.resolve(process.cwd(), 'src/data/bubtAlumniDirectory.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        localDirectory = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading local alumni directory:', e);
    }

    // 2. Fetch live CSE members from bubtcsealumni.org if applicable
    let cseLiveMembers: DiscoveredAlumnus[] = [];
    if (dept === 'all' || dept === 'cse') {
      try {
        const cseHtml = await fetchUrl('https://bubtcsealumni.org/members');
        if (cseHtml) {
          const cardRegex = /<h3 class="text-base font-bold text-gray-900 truncate">([\s\S]*?)<\/h3>[\s\S]*?(?:Intake\s*(\d+))?[\s\S]*?<p class="text-xs font-medium text-gray-700 mt-2 truncate">([\s\S]*?)<\/p>/gi;
          let match;
          let idx = 0;
          while ((match = cardRegex.exec(cseHtml)) !== null && idx < 10) {
            idx++;
            const name = match[1].replace(/<[^>]+>/g, '').trim();
            const intakeNum = match[2] ? Number(match[2]) : null;
            const fullRole = match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            
            let designation = fullRole;
            let company = '';
            if (fullRole.includes(' at ')) {
              const parts = fullRole.split(' at ');
              designation = parts[0].trim();
              company = parts[1].trim();
            }

            cseLiveMembers.push({
              id: `live-cse-${idx}`,
              full_name: name,
              department: 'CSE',
              intake: intakeNum,
              passing_year: intakeNum ? 2010 + Math.floor(intakeNum / 3) : null,
              designation,
              company,
              linkedin_url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + ' BUBT')}`,
              email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
              source: 'BUBT CSE Alumni Portal (Live)',
            });
          }
        }
      } catch (err) {
        console.warn('CSE alumni live fetch error:', err);
      }
    }

    // 3. Combine and filter
    const combined = [...localDirectory, ...cseLiveMembers];

    // Deduplicate by name
    const seenNames = new Set<string>();
    const uniqueList: DiscoveredAlumnus[] = [];

    for (const item of combined) {
      const key = item.full_name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        uniqueList.push(item);
      }
    }

    // Apply department filter
    let results = uniqueList.filter((item) => {
      if (dept !== 'all' && item.department.toLowerCase() !== dept) {
        return false;
      }
      if (query) {
        const matchesName = item.full_name.toLowerCase().includes(query);
        const matchesCompany = (item.company || '').toLowerCase().includes(query);
        const matchesRole = (item.designation || '').toLowerCase().includes(query);
        const matchesDept = item.department.toLowerCase().includes(query);
        if (!matchesName && !matchesCompany && !matchesRole && !matchesDept) return false;
      }
      return true;
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      count: results.length,
      results,
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: err.message || 'Alumni search failed' }));
  }
}
