/**
 * sync-bubt-data.js
 * Automated sync script for BUBT faculty roster, notices, and VC info.
 * Can be run manually or via GitHub Actions.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const FACULTY_PATH = path.join(ROOT_DIR, 'src', 'data', 'universityFaculty.json');
const FACULTY_IMG_DIR = path.join(ROOT_DIR, 'public', 'faculty-images');
const NOTICES_PATH = path.join(ROOT_DIR, 'src', 'data', 'recentNotices.json');
const LEADERSHIP_PATH = path.join(ROOT_DIR, 'src', 'data', 'leadershipData.json');
const VC_IMG_PATH = path.join(ROOT_DIR, 'public', 'images', 'vc-shawkat-ali.jpg');

const DEPARTMENTS = [
  { id: "cse", name: "Computer Science & Engineering", faculty: "Faculty of Computer Science & AI", slug: "department-of-computer-science-engineering" },
  { id: "ds", name: "Data Science & Engineering", faculty: "Faculty of Computer Science & AI", slug: "department-of-data-science-engineering" },
  { id: "eee", name: "Electrical & Electronic Engineering", faculty: "Faculty of Sciences & Engineering", slug: "department-of-electrical-electronic-engineering" },
  { id: "civil", name: "Civil Engineering", faculty: "Faculty of Sciences & Engineering", slug: "department-of-civil-engineering" },
  { id: "textile", name: "Textile Engineering", faculty: "Faculty of Sciences & Engineering", slug: "department-of-textile-engineering" },
  { id: "math", name: "Mathematics & Statistics", faculty: "Faculty of Sciences & Engineering", slug: "department-of-mathematics-statistics" },
  { id: "law", name: "Law & Justice", faculty: "Faculty of Law", slug: "department-of-law-justice" },
  { id: "english", name: "English", faculty: "Faculty of Arts & Humanities", slug: "department-of-english" },
  { id: "management", name: "Management", faculty: "Faculty of Business & Economics", slug: "department-of-management" },
  { id: "accounting", name: "Accounting", faculty: "Faculty of Business & Economics", slug: "department-of-accounting" },
  { id: "finance", name: "Finance", faculty: "Faculty of Business & Economics", slug: "department-of-finance" },
  { id: "marketing", name: "Marketing", faculty: "Faculty of Business & Economics", slug: "department-of-marketing" },
  { id: "economics", name: "Economics", faculty: "Faculty of Business & Economics", slug: "department-of-economics" }
];

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => {
      console.warn(`[WARN] Fetch failed for ${url}: ${err.message}`);
      resolve('');
    }).on('timeout', () => {
      console.warn(`[WARN] Timeout for ${url}`);
      resolve('');
    });
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode !== 200) {
        file.close(() => {
          try { fs.unlinkSync(destPath); } catch (e) {}
          resolve(false);
        });
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const stats = fs.statSync(destPath);
          if (stats.size < 500) {
            try { fs.unlinkSync(destPath); } catch (e) {}
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    });

    req.on('error', () => {
      file.close(() => {
        try { fs.unlinkSync(destPath); } catch (e) {}
        resolve(false);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      file.close(() => {
        try { fs.unlinkSync(destPath); } catch (e) {}
        resolve(false);
      });
    });
  });
}

function parseCards(html, dept) {
  const cardRegex = /<div class="faculty-card[\s\S]*?(?=(?:<div class="faculty-card|<\/section>))/gi;
  const cards = html.match(cardRegex) || [];
  const list = [];

  for (const card of cards) {
    const nameMatch = card.match(/class="faculty-name[^"]*">\s*([\s\S]*?)\s*<\/h3>/i);
    const name = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : null;
    if (!name) continue;

    const imgMatch = card.match(/<img[\s\S]*?src="([^"]+)"/i);
    let img = imgMatch ? imgMatch[1].trim() : null;
    if (img && img.includes('shutterstock')) img = null;

    const desMatches = [...card.matchAll(/<p class="(?:faculty-designation|bg-indigo-700)[^"]*">\s*([\s\S]*?)\s*<\/p>/gi)];
    const designations = desMatches
      .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/&amp;/g, '&').trim())
      .filter(Boolean);

    const profileMatch = card.match(/href="([^"]*profile\/[^"]+)"/i);
    const profileUrl = profileMatch ? profileMatch[1].trim() : null;
    const code = profileUrl ? profileUrl.split('/').pop().trim() : null;

    list.push({
      id: `${dept.id}-${code || name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name,
      code,
      departmentId: dept.id,
      departmentName: dept.name,
      facultyGroup: dept.faculty,
      designations,
      primaryDesignation: designations[0] || "Faculty Member",
      img,
      profileUrl
    });
  }
  return list;
}

function getRankPriority(designation = '') {
  const d = designation.toLowerCase();
  if (d.includes('chair') || d.includes('head')) return 10;
  if (d.includes('distinguished professor') || d.includes('dean')) return 20;
  if (d.includes('professor') && !d.includes('assistant') && !d.includes('associate')) return 30;
  if (d.includes('associate professor')) return 40;
  if (d.includes('assistant professor')) return 50;
  if (d.includes('senior lecturer')) return 60;
  if (d.includes('lecturer')) return 70;
  if (d.includes('instructor') || d.includes('fellow')) return 80;
  return 90;
}

async function syncFaculty() {
  console.log('--- 1. Syncing Faculty Directory ---');
  const existingFaculty = fs.existsSync(FACULTY_PATH) ? JSON.parse(fs.readFileSync(FACULTY_PATH, 'utf8')) : [];
  const existingMap = new Map(existingFaculty.map(f => [f.id, f]));

  const freshList = [];
  for (const dept of DEPARTMENTS) {
    const url = `https://www.bubt.edu.bd/department/${dept.slug}/faculty`;
    process.stdout.write(`Fetching ${dept.name}... `);
    const html = await fetchUrl(url);
    const parsed = parseCards(html, dept);
    console.log(`${parsed.length} members found.`);

    for (const p of parsed) {
      const existing = existingMap.get(p.id);
      freshList.push({
        ...p,
        email: existing?.email || null,
        phone: existing?.phone || null,
        bloodGroup: existing?.bloodGroup || null,
        room: existing?.room || null,
        summary: existing?.summary || null,
        educations: existing?.educations || [],
        experiences: existing?.experiences || [],
        publications: existing?.publications || [],
      });
    }
  }

  // Deduplicate and resolve unique IDs
  const seenIds = new Set();
  const deduped = [];
  for (const member of freshList) {
    if (member.name === "Mehedi Hasan" && member.departmentId === "eee") {
      const isLab = (member.primaryDesignation || "").toLowerCase().includes("lab");
      member.id = isLab ? "eee-mehedi_hasan_lab" : "eee-mehedi_hasan_ap";
    }
    if (!seenIds.has(member.id)) {
      seenIds.add(member.id);
      deduped.push(member);
    }
  }

  // Sort by department and rank priority
  deduped.sort((a, b) => {
    if (a.departmentId !== b.departmentId) return a.departmentId.localeCompare(b.departmentId);
    const rA = getRankPriority(a.primaryDesignation);
    const rB = getRankPriority(b.primaryDesignation);
    if (rA !== rB) return rA - rB;
    return a.name.localeCompare(b.name);
  });

  if (deduped.length > 300) {
    // Ensure faculty images directory exists
    fs.mkdirSync(FACULTY_IMG_DIR, { recursive: true });
    console.log('Syncing faculty images to local public/faculty-images/ folder...');
    let downloaded = 0;

    for (const member of deduped) {
      const localFilePath = path.join(FACULTY_IMG_DIR, `${member.id}.jpg`);
      const localRelPath = `/faculty-images/${member.id}.jpg`;

      if (member.img && member.img.startsWith('http')) {
        const liveUrl = member.img;
        const ok = await downloadImage(liveUrl, localFilePath);
        if (ok) {
          member.img = localRelPath;
          downloaded++;
        } else if (fs.existsSync(localFilePath)) {
          member.img = localRelPath;
        } else {
          member.img = null;
        }
      } else if (fs.existsSync(localFilePath)) {
        member.img = localRelPath;
      } else {
        member.img = null;
      }
    }
    console.log(`[SUCCESS] Downloaded/updated ${downloaded} faculty images locally.`);

    fs.writeFileSync(FACULTY_PATH, JSON.stringify(deduped, null, 2));
    console.log(`[SUCCESS] Saved ${deduped.length} faculty members to universityFaculty.json`);
  } else {
    console.warn(`[SKIP] Insufficient faculty items fetched (${deduped.length}), keeping existing data.`);
  }
}

async function syncNotices() {
  console.log('--- 2. Syncing University Notices ---');
  const html = await fetchUrl('https://www.bubt.edu.bd/notice');
  const match = html.match(/notices:\s*(\[[\s\S]*?\])\s*,/);
  if (!match) {
    console.warn('[WARN] Could not parse notices array from BUBT portal.');
    return;
  }

  const rawList = JSON.parse(match[1]);
  const cleaned = rawList.slice(0, 60).map(n => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    category: n.category ? { id: n.category.id, name: n.category.name, slug: n.category.slug } : null,
    file: n.file ? (n.file.startsWith('http') ? n.file : `https://www.bubt.edu.bd/storage/${n.file}`) : null,
    created_at: n.created_at,
    type: n.type || 'office'
  }));

  if (cleaned.length > 0) {
    fs.writeFileSync(NOTICES_PATH, JSON.stringify(cleaned, null, 2));
    console.log(`[SUCCESS] Saved ${cleaned.length} notices to recentNotices.json`);
  }
}

async function syncVcImage() {
  console.log('--- 3. Verifying VC Portrait ---');
  if (fs.existsSync(VC_IMG_PATH)) {
    const stats = fs.statSync(VC_IMG_PATH);
    console.log(`[OK] VC image exists locally (${stats.size} bytes).`);
    return;
  }

  const targetUrl = 'https://www.bubt.edu.bd/storage/office_staff_image/prof-dr-a-b-m-shawkat-ali_24160012003_2c55c2f7-bb43-404e-b263-62ffb37cd0ca.jpg';
  fs.mkdirSync(path.dirname(VC_IMG_PATH), { recursive: true });
  const file = fs.createWriteStream(VC_IMG_PATH);

  await new Promise((resolve) => {
    https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[SUCCESS] Downloaded VC image to ${VC_IMG_PATH}`);
        resolve();
      });
    }).on('error', (err) => {
      console.warn(`[WARN] Failed to download VC image: ${err.message}`);
      resolve();
    });
  });
}

async function main() {
  console.log('=== Starting BUBT Live Data Synchronization ===');
  await syncVcImage();
  await syncNotices();
  await syncFaculty();
  console.log('=== Synchronization Finished Successfully ===');
}

main().catch(err => {
  console.error('[ERROR] Sync failed:', err);
  process.exit(1);
});
