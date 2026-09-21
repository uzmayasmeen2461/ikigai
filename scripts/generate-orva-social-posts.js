const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(process.cwd(), "public", "orva-social-posts");
fs.mkdirSync(outDir, { recursive: true });

const W = 1080;
const H = 1080;

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lines(text, max = 22) {
  const words = String(text).split(/\s+/);
  const rows = [];
  let row = "";
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (next.length > max && row) {
      rows.push(row);
      row = word;
    } else {
      row = next;
    }
  }
  if (row) rows.push(row);
  return rows;
}

function orvaMark(x, y, size = 72, dark = false) {
  const color = dark ? "#071525" : "#7df4ff";
  const glow = dark ? "#1b4fd8" : "#62d7ff";
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  const nodes = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12;
    const nx = cx + Math.cos(a) * r * 0.78;
    const ny = cy + Math.sin(a) * r * 0.78;
    const ex = cx + Math.cos(a) * r * 1.08;
    const ey = cy + Math.sin(a) * r * 1.08;
    return `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${glow}" stroke-width="${size * 0.035}" opacity=".75"/><circle cx="${nx}" cy="${ny}" r="${size * 0.055}" fill="${glow}"/><circle cx="${ex}" cy="${ey}" r="${size * 0.07}" fill="none" stroke="${glow}" stroke-width="${size * 0.035}"/>`;
  }).join("");
  return `<g>${nodes}<circle cx="${cx}" cy="${cy}" r="${size * 0.22}" fill="${color}" opacity=".95"/><text x="${cx}" y="${cy + size * 0.09}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${size * 0.34}" font-weight="900" fill="${dark ? "#ffffff" : "#071525"}">O</text></g>`;
}

function phoneMockup(x, y, w, h, products = []) {
  const itemRows = products.map((item, i) => {
    const iy = y + 152 + i * 118;
    const color = item.color || "#eef6ff";
    return `<g>
      <rect x="${x + 34}" y="${iy}" width="${w - 68}" height="88" rx="24" fill="#ffffff" stroke="#dbeafe"/>
      <rect x="${x + 54}" y="${iy + 17}" width="54" height="54" rx="16" fill="${color}"/>
      <circle cx="${x + 81}" cy="${iy + 44}" r="15" fill="${item.accent || "#1b4fd8"}" opacity=".85"/>
      <text x="${x + 126}" y="${iy + 39}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" fill="#071525">${esc(item.name)}</text>
      <text x="${x + 126}" y="${iy + 68}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#667085">${esc(item.meta)}</text>
    </g>`;
  }).join("");
  return `<g filter="url(#softShadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="58" fill="#081729"/>
    <rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="44" fill="#f8fbff"/>
    <rect x="${x + w * 0.37}" y="${y + 28}" width="${w * 0.26}" height="18" rx="9" fill="#081729"/>
    <text x="${x + 36}" y="${y + 95}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="900" fill="#071525">ORVA Store</text>
    <circle cx="${x + w - 58}" cy="${y + 84}" r="17" fill="#eaf2ff"/>
    ${itemRows}
    <rect x="${x + 44}" y="${y + h - 112}" width="${w - 88}" height="54" rx="18" fill="url(#blueGrad)"/>
    <text x="${x + w / 2}" y="${y + h - 76}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="900" fill="#ffffff">Publish</text>
  </g>`;
}

function headlineBlock(title, subtitle, x = 72, y = 245, width = 480, color = "#ffffff") {
  const titleRows = lines(title, 18);
  const subtitleRows = lines(subtitle, 42);
  return `<g>
    ${titleRows.map((line, i) => `<text x="${x}" y="${y + i * 76}" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="950" fill="${color}" letter-spacing="-1">${esc(line)}</text>`).join("")}
    ${subtitleRows.map((line, i) => `<text x="${x}" y="${y + titleRows.length * 76 + 42 + i * 34}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="650" fill="${color === "#ffffff" ? "#c7d8f7" : "#405064"}">${esc(line)}</text>`).join("")}
  </g>`;
}

function base({ dark = false, tag = "", number = "01" }) {
  const bg = dark
    ? `<rect width="${W}" height="${H}" fill="#071525"/><path d="M0 0h1080v1080H0z" fill="url(#darkGlow)"/><g opacity=".16">${Array.from({ length: 18 }, (_, i) => `<path d="M${i * 68} 0v1080M0 ${i * 68}h1080" stroke="#66eaff" stroke-width="1"/>`).join("")}</g>`
    : `<rect width="${W}" height="${H}" fill="#f6fbff"/><path d="M0 0h1080v1080H0z" fill="url(#lightGlow)"/><g opacity=".18">${Array.from({ length: 14 }, (_, i) => `<circle cx="${90 + i * 78}" cy="${130 + (i % 4) * 150}" r="2" fill="#1b4fd8"/>`).join("")}</g>`;
  return `${bg}
    <g transform="translate(58 52)">${orvaMark(0, 0, 62, !dark)}<text x="82" y="43" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="950" fill="${dark ? "#ffffff" : "#071525"}">ORVA</text></g>
    <rect x="920" y="56" width="92" height="48" rx="18" fill="${dark ? "#1b4fd8" : "#205ee8"}"/>
    <text x="966" y="89" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="950" fill="#ffffff">${number}</text>
    ${tag ? `<rect x="72" y="920" width="${Math.max(240, tag.length * 16)}" height="58" rx="29" fill="${dark ? "rgba(255,255,255,.12)" : "#ffffff"}" stroke="${dark ? "rgba(255,255,255,.22)" : "#dbeafe"}"/><text x="105" y="957" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900" fill="${dark ? "#92f6ff" : "#1b4fd8"}">${esc(tag)}</text>` : ""}`;
}

function svgCard(card) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="blueGrad" x1="0" x2="1"><stop stop-color="#1b7cff"/><stop offset="1" stop-color="#6f3cff"/></linearGradient>
    <radialGradient id="darkGlow" cx=".72" cy=".2" r=".9"><stop stop-color="#183b92" stop-opacity=".86"/><stop offset=".42" stop-color="#0a2c47" stop-opacity=".6"/><stop offset="1" stop-color="#071525"/></radialGradient>
    <radialGradient id="lightGlow" cx=".9" cy=".05" r=".95"><stop stop-color="#e9f0ff"/><stop offset=".55" stop-color="#f6fbff"/><stop offset="1" stop-color="#eefbff"/></radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#09214a" flood-opacity=".18"/></filter>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${card}
  </svg>`;
}

const cards = [
  {
    file: "orva-01-inventory-to-sales.png",
    svg: svgCard(`${base({ dark: true, number: "01", tag: "For local businesses" })}
      ${headlineBlock("Turn Your Inventory Into Online Sales", "Upload products once. ORVA creates your catalog, social posts, and store preview.", 72, 230, 500)}
      ${phoneMockup(650, 210, 310, 610, [
        { name: "Face Serum", meta: "Ready to post", color: "#fff0dd", accent: "#f59e0b" },
        { name: "Handbag", meta: "Catalog ready", color: "#ffe4ee", accent: "#ec4899" },
        { name: "Kurti", meta: "In stock", color: "#e0f2fe", accent: "#0284c7" },
      ])}
      <circle cx="590" cy="760" r="90" fill="#25D366" opacity=".95" filter="url(#glow)"/><text x="590" y="780" text-anchor="middle" font-family="Inter,Arial" font-size="70" font-weight="900" fill="#fff">✓</text>`),
  },
  {
    file: "orva-02-no-inventory.png",
    svg: svgCard(`${base({ dark: false, number: "02", tag: "No inventory list? No problem" })}
      ${headlineBlock("Only Have Product Photos?", "Upload photos and prices. ORVA helps create titles, descriptions, captions, and a usable product list.", 72, 205, 540, "#071525")}
      <g filter="url(#softShadow)">${Array.from({ length: 9 }, (_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 630 + col * 118, y = 245 + row * 132;
        return `<rect x="${x}" y="${y}" width="96" height="112" rx="24" fill="#ffffff" stroke="#dbeafe"/><rect x="${x + 22}" y="${y + 18}" width="52" height="70" rx="20" fill="${["#f59e0b", "#8b5cf6", "#06b6d4"][i % 3]}"/><circle cx="${x + 48}" cy="${y + 54}" r="22" fill="#071525" opacity=".12"/>`;
      }).join("")}</g>
      <rect x="72" y="724" width="420" height="86" rx="28" fill="url(#blueGrad)"/><text x="282" y="778" text-anchor="middle" font-family="Inter,Arial" font-size="32" font-weight="950" fill="#fff">AI creates the listing</text>`),
  },
  {
    file: "orva-03-ai-captions.png",
    svg: svgCard(`${base({ dark: false, number: "03", tag: "Captions, hashtags, CTAs" })}
      ${headlineBlock("Posts That Sound Like Your Brand", "Generate stronger captions for Instagram and Facebook, then edit before publishing.", 72, 218, 500, "#071525")}
      <g filter="url(#softShadow)">
        <rect x="595" y="210" width="370" height="610" rx="44" fill="#fff"/>
        <rect x="635" y="260" width="290" height="290" rx="34" fill="#ffe4ee"/>
        <circle cx="780" cy="405" r="92" fill="#ec4899" opacity=".75"/>
        <rect x="635" y="590" width="290" height="52" rx="18" fill="#f0f6ff"/>
        <rect x="635" y="660" width="230" height="34" rx="17" fill="#dbeafe"/>
        <text x="635" y="747" font-family="Inter,Arial" font-size="30" font-weight="950" fill="#071525">New arrival ✨</text>
        <text x="635" y="790" font-family="Inter,Arial" font-size="24" font-weight="800" fill="#405064">DM to order today</text>
      </g>
      <g transform="translate(90 760)"><rect width="360" height="74" rx="24" fill="#fff" stroke="#dbeafe"/><text x="34" y="47" font-family="Inter,Arial" font-size="26" font-weight="950" fill="#1b4fd8">Write with AI</text><text x="300" y="48" font-family="Inter,Arial" font-size="30" font-weight="950" fill="#6f3cff">✦</text></g>`),
  },
  {
    file: "orva-04-growth-autopilot.png",
    svg: svgCard(`${base({ dark: false, number: "04", tag: "Schedule the full week" })}
      ${headlineBlock("Your Marketing Calendar, Ready in Minutes", "Choose images or products. ORVA spaces posts automatically and keeps your campaign organized.", 72, 198, 560, "#071525")}
      <g filter="url(#softShadow)">
        <rect x="625" y="210" width="350" height="520" rx="42" fill="#ffffff"/>
        <text x="670" y="278" font-family="Inter,Arial" font-size="30" font-weight="950" fill="#071525">July Campaign</text>
        ${Array.from({ length: 5 }, (_, i) => {
          const y = 326 + i * 72;
          const c = ["#1b7cff", "#ec4899", "#25D366", "#f59e0b", "#6f3cff"][i];
          return `<rect x="668" y="${y}" width="240" height="48" rx="18" fill="${c}" opacity=".92"/><text x="788" y="${y + 32}" text-anchor="middle" font-family="Inter,Arial" font-size="20" font-weight="950" fill="#fff">${10 + i}:00 AM Post</text>`;
        }).join("")}
        <rect x="668" y="696" width="240" height="58" rx="20" fill="#071525"/><text x="788" y="734" text-anchor="middle" font-family="Inter,Arial" font-size="22" font-weight="950" fill="#fff">Pause Anytime</text>
      </g>
      <path d="M150 795c120 70 250 60 360-20" fill="none" stroke="#1b4fd8" stroke-width="8" stroke-linecap="round"/><path d="M488 744l52 24-48 31" fill="none" stroke="#1b4fd8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    file: "orva-05-reel-studio.png",
    svg: svgCard(`${base({ dark: true, number: "05", tag: "Reel Studio" })}
      ${headlineBlock("Make Product Reels Without Editing Stress", "Select product images, add music, generate captions, preview, and publish or download.", 72, 205, 520)}
      <g filter="url(#softShadow)">
        <rect x="660" y="172" width="300" height="650" rx="62" fill="#0a0f1d"/>
        <rect x="680" y="198" width="260" height="598" rx="44" fill="#fbd3df"/>
        <rect x="724" y="298" width="172" height="260" rx="42" fill="#fff"/>
        <circle cx="810" cy="428" r="66" fill="#7c3aed" opacity=".8"/>
        <circle cx="810" cy="428" r="42" fill="#fff"/><polygon points="798,403 798,453 840,428" fill="#1b4fd8"/>
        <rect x="710" y="650" width="200" height="52" rx="26" fill="#0a0f1d" opacity=".9"/><text x="810" y="684" text-anchor="middle" font-family="Inter,Arial" font-size="22" font-weight="950" fill="#fff">Preview Reel</text>
      </g>
      <g transform="translate(90 755)"><rect width="420" height="92" rx="30" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.22)"/><text x="36" y="57" font-family="Inter,Arial" font-size="30" font-weight="950" fill="#92f6ff">Download or publish</text></g>`),
  },
  {
    file: "orva-06-growth-partner.png",
    svg: svgCard(`${base({ dark: true, number: "06", tag: "7-day free trial" })}
      ${headlineBlock("Grow Online With ORVA", "For boutiques, salons, cafes, service businesses, and local brands that want consistent online presence.", 72, 200, 620)}
      <g filter="url(#softShadow)">
        <rect x="672" y="250" width="300" height="410" rx="44" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.24)"/>
        <text x="822" y="325" text-anchor="middle" font-family="Inter,Arial" font-size="32" font-weight="950" fill="#fff">ORVA helps you</text>
        ${["Get discovered", "Post consistently", "Drive enquiries", "Save time"].map((t, i) => `<circle cx="730" cy="${390 + i * 62}" r="16" fill="#25D366"/><text x="762" y="${400 + i * 62}" font-family="Inter,Arial" font-size="26" font-weight="850" fill="#dcecff">${esc(t)}</text>`).join("")}
      </g>
      <rect x="72" y="795" width="455" height="86" rx="30" fill="url(#blueGrad)" filter="url(#glow)"/><text x="300" y="850" text-anchor="middle" font-family="Inter,Arial" font-size="32" font-weight="950" fill="#fff">Start with ORVA today</text>`),
  },
  {
    file: "orva-07-upload-inventory.png",
    svg: svgCard(`${base({ dark: false, number: "07", tag: "Upload Inventory" })}
      ${headlineBlock("Upload Your Product List Once", "CSV, Excel, or simple product data. ORVA turns it into a clean workspace for posting and previews.", 72, 205, 555, "#071525")}
      <g filter="url(#softShadow)">
        <rect x="635" y="238" width="330" height="430" rx="40" fill="#ffffff"/>
        <rect x="690" y="300" width="220" height="160" rx="34" fill="#eef6ff" stroke="#b8d4ff" stroke-dasharray="12 10"/>
        <path d="M800 410V328M760 366l40-40 40 40" fill="none" stroke="#1b4fd8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
        ${["CSV", "XLS", "IMG"].map((t, i) => `<rect x="${685 + i * 78}" y="520" width="58" height="70" rx="16" fill="${["#ecfdf5", "#eff6ff", "#fff7ed"][i]}" stroke="#dbeafe"/><text x="${714 + i * 78}" y="562" text-anchor="middle" font-family="Inter,Arial" font-size="19" font-weight="950" fill="${["#059669", "#1b4fd8", "#f97316"][i]}">${t}</text>`).join("")}
      </g>
      <rect x="72" y="785" width="510" height="76" rx="28" fill="url(#blueGrad)"/><text x="327" y="834" text-anchor="middle" font-family="Inter,Arial" font-size="30" font-weight="950" fill="#fff">Bulk upload made simple</text>`),
  },
  {
    file: "orva-08-photo-to-inventory.png",
    svg: svgCard(`${base({ dark: false, number: "08", tag: "Photo to Inventory" })}
      ${headlineBlock("No List? Upload Photos + Prices", "ORVA helps create product titles, descriptions, captions, and organized inventory from photos.", 72, 205, 560, "#071525")}
      <g filter="url(#softShadow)">
        ${Array.from({ length: 6 }, (_, i) => {
          const x = 650 + (i % 2) * 150, y = 230 + Math.floor(i / 2) * 145;
          return `<rect x="${x}" y="${y}" width="126" height="126" rx="32" fill="#ffffff" stroke="#dbeafe"/><rect x="${x + 32}" y="${y + 24}" width="62" height="70" rx="22" fill="${["#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#10b981", "#f97316"][i]}"/><text x="${x + 63}" y="${y + 112}" text-anchor="middle" font-family="Inter,Arial" font-size="18" font-weight="900" fill="#071525">₹${[299,499,799,999,1299,1499][i]}</text>`;
        }).join("")}
      </g>
      <g transform="translate(90 790)"><circle cx="34" cy="34" r="34" fill="#25D366"/><text x="34" y="46" text-anchor="middle" font-family="Inter,Arial" font-size="34" font-weight="950" fill="#fff">✓</text><text x="90" y="43" font-family="Inter,Arial" font-size="28" font-weight="950" fill="#1b4fd8">AI creates a clean product list</text></g>`),
  },
  {
    file: "orva-09-preview-studio.png",
    svg: svgCard(`${base({ dark: true, number: "09", tag: "Preview Studio" })}
      ${headlineBlock("See Your Store Before You Publish", "Preview how your product looks on mobile store, Instagram, Facebook, and WhatsApp-style catalog.", 72, 200, 550)}
      ${phoneMockup(645, 175, 310, 640, [
        { name: "Store Preview", meta: "Mobile page", color: "#e0f2fe", accent: "#0284c7" },
        { name: "Instagram", meta: "Post view", color: "#ffe4ee", accent: "#ec4899" },
        { name: "Facebook", meta: "Page post", color: "#dbeafe", accent: "#1b4fd8" },
      ])}
      <rect x="72" y="792" width="430" height="78" rx="28" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.2)"/><text x="287" y="843" text-anchor="middle" font-family="Inter,Arial" font-size="30" font-weight="950" fill="#92f6ff">Preview simulation</text>`),
  },
  {
    file: "orva-10-social-content.png",
    svg: svgCard(`${base({ dark: false, number: "10", tag: "Social Content" })}
      ${headlineBlock("Create Content for Every Channel", "Generate post captions, hashtags, product copy, and CTAs that are ready to edit and publish.", 72, 205, 560, "#071525")}
      <g filter="url(#softShadow)">
        ${[
          ["Caption ✨", "Your product deserves the spotlight.", "#fff7ed", "#f97316"],
          ["Hashtags #", "#ShopLocal #NewArrival #ORVA", "#eef2ff", "#6f3cff"],
          ["CTA", "DM us to order today.", "#ecfdf5", "#059669"],
        ].map((row, i) => `<rect x="620" y="${260 + i * 150}" width="370" height="110" rx="30" fill="#ffffff" stroke="#dbeafe"/><circle cx="680" cy="${315 + i * 150}" r="28" fill="${row[2]}"/><text x="730" y="${306 + i * 150}" font-family="Inter,Arial" font-size="24" font-weight="950" fill="${row[3]}">${esc(row[0])}</text><text x="730" y="${342 + i * 150}" font-family="Inter,Arial" font-size="21" font-weight="750" fill="#405064">${esc(row[1])}</text>`).join("")}
      </g>
      <rect x="72" y="796" width="430" height="76" rx="28" fill="url(#blueGrad)"/><text x="287" y="844" text-anchor="middle" font-family="Inter,Arial" font-size="29" font-weight="950" fill="#fff">Copy, edit, publish</text>`),
  },
  {
    file: "orva-11-inventory-intelligence.png",
    svg: svgCard(`${base({ dark: false, number: "11", tag: "Inventory Intelligence" })}
      ${headlineBlock("Know What Needs Attention", "ORVA highlights low stock, missing images, ignored products, and items ready to promote.", 72, 205, 555, "#071525")}
      <g filter="url(#softShadow)">
        <rect x="615" y="235" width="380" height="510" rx="42" fill="#ffffff"/>
        ${[
          ["Low Stock", "8 products", "#fee2e2", "#ef4444", "!"],
          ["Not Promoted", "15 products", "#eef2ff", "#4f46e5", "↗"],
          ["Missing Images", "12 products", "#eff6ff", "#1b7cff", "□"],
          ["Ready to Post", "7 products", "#ecfdf5", "#059669", "✓"],
        ].map((r, i) => `<rect x="660" y="${302 + i * 86}" width="290" height="62" rx="20" fill="${r[2]}"/><circle cx="696" cy="${333 + i * 86}" r="18" fill="${r[3]}"/><text x="696" y="${342 + i * 86}" text-anchor="middle" font-family="Inter,Arial" font-size="22" font-weight="950" fill="#fff">${r[4]}</text><text x="728" y="${326 + i * 86}" font-family="Inter,Arial" font-size="22" font-weight="950" fill="#071525">${r[0]}</text><text x="728" y="${350 + i * 86}" font-family="Inter,Arial" font-size="18" font-weight="700" fill="#667085">${r[1]}</text>`).join("")}
      </g>
      <path d="M95 845c95-30 176-88 240-174" fill="none" stroke="#1b4fd8" stroke-width="8" stroke-linecap="round"/><path d="M315 668l34-17-4 38" fill="none" stroke="#1b4fd8" stroke-width="8" stroke-linecap="round"/>`),
  },
  {
    file: "orva-12-connections.png",
    svg: svgCard(`${base({ dark: true, number: "12", tag: "Connections" })}
      ${headlineBlock("Connect Your Digital Channels", "Manage Facebook, Instagram, WhatsApp workflows, and online store previews from one ORVA workspace.", 72, 205, 570)}
      <g filter="url(#softShadow)">
        <circle cx="765" cy="430" r="96" fill="#091a32" stroke="#7df4ff" stroke-width="4"/>
        ${orvaMark(710, 375, 110, false)}
        ${[
          [765,220,"IG","#ec4899"],[965,430,"FB","#1b7cff"],[765,650,"WA","#25D366"],[565,430,"WEB","#6f3cff"]
        ].map(([x,y,t,c]) => `<line x1="765" y1="430" x2="${x}" y2="${y}" stroke="#7df4ff" stroke-width="3" opacity=".55"/><circle cx="${x}" cy="${y}" r="58" fill="${c}"/><text x="${x}" y="${y+9}" text-anchor="middle" font-family="Inter,Arial" font-size="25" font-weight="950" fill="#fff">${t}</text>`).join("")}
      </g>
      <rect x="72" y="802" width="430" height="76" rx="28" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.2)"/><text x="287" y="850" text-anchor="middle" font-family="Inter,Arial" font-size="28" font-weight="950" fill="#92f6ff">One dashboard</text>`),
  },
  {
    file: "orva-13-client-onboarding.png",
    svg: svgCard(`${base({ dark: false, number: "13", tag: "Client Onboarding" })}
      ${headlineBlock("Choose Your ORVA Flow", "Have inventory? Upload it. Only have photos? Add prices and let ORVA prepare the product list.", 72, 205, 565, "#071525")}
      <g filter="url(#softShadow)">
        <rect x="625" y="245" width="340" height="170" rx="34" fill="#ffffff" stroke="#dbeafe"/><text x="670" y="310" font-family="Inter,Arial" font-size="26" font-weight="950" fill="#071525">I have inventory</text><text x="670" y="352" font-family="Inter,Arial" font-size="22" font-weight="750" fill="#667085">CSV + images</text>
        <rect x="625" y="455" width="340" height="170" rx="34" fill="#ffffff" stroke="#dbeafe"/><text x="670" y="520" font-family="Inter,Arial" font-size="26" font-weight="950" fill="#071525">I only have photos</text><text x="670" y="562" font-family="Inter,Arial" font-size="22" font-weight="750" fill="#667085">Photos + prices</text>
      </g>
      <rect x="72" y="802" width="400" height="74" rx="28" fill="url(#blueGrad)"/><text x="272" y="850" text-anchor="middle" font-family="Inter,Arial" font-size="28" font-weight="950" fill="#fff">Start free trial</text>`),
  },
  {
    file: "orva-14-admin-worker.png",
    svg: svgCard(`${base({ dark: false, number: "14", tag: "Managed support" })}
      ${headlineBlock("Need Human Help? ORVA Can Track It", "Create tasks for setup specialists: pages, catalogs, WhatsApp Business setup, and manual updates.", 72, 205, 555, "#071525")}
      <g filter="url(#softShadow)">
        <rect x="620" y="230" width="390" height="520" rx="42" fill="#ffffff"/>
        ${["Create Facebook Page", "Setup Instagram Page", "WhatsApp Business Setup", "Catalog Cleanup"].map((t, i) => `<rect x="666" y="${300 + i * 84}" width="300" height="58" rx="19" fill="${i % 2 ? "#f8fbff" : "#eef6ff"}"/><circle cx="700" cy="${329 + i * 84}" r="14" fill="${i === 3 ? "#25D366" : "#1b4fd8"}"/><text x="728" y="${337 + i * 84}" font-family="Inter,Arial" font-size="21" font-weight="850" fill="#071525">${esc(t)}</text>`).join("")}
      </g>
      <rect x="72" y="800" width="455" height="74" rx="28" fill="url(#blueGrad)"/><text x="300" y="848" text-anchor="middle" font-family="Inter,Arial" font-size="28" font-weight="950" fill="#fff">Admin + worker flow</text>`),
  },
  {
    file: "orva-15-pricing-trial.png",
    svg: svgCard(`${base({ dark: false, number: "15", tag: "Simple pricing" })}
      ${headlineBlock("Start With 7 Days Free", "Try ORVA, then choose the setup and growth support level that fits your business.", 72, 205, 535, "#071525")}
      <g filter="url(#softShadow)">
        ${[
          ["Setup", "₹2,000", "Initial ORVA setup"],["Managed", "₹7,000", "Catalog support"],["Advanced", "₹15,000", "Automation + growth"]
        ].map((p, i) => `<rect x="${560 + i * 150}" y="${330 - i * 18}" width="138" height="${310 + i * 36}" rx="34" fill="${i === 1 ? "url(#blueGrad)" : "#ffffff"}" stroke="#dbeafe"/><text x="${629 + i * 150}" y="${405}" text-anchor="middle" font-family="Inter,Arial" font-size="22" font-weight="950" fill="${i === 1 ? "#fff" : "#071525"}">${p[0]}</text><text x="${629 + i * 150}" y="${475}" text-anchor="middle" font-family="Inter,Arial" font-size="31" font-weight="950" fill="${i === 1 ? "#fff" : "#1b4fd8"}">${p[1]}</text><text x="${629 + i * 150}" y="${532}" text-anchor="middle" font-family="Inter,Arial" font-size="17" font-weight="800" fill="${i === 1 ? "#dcecff" : "#667085"}">${p[2]}</text>`).join("")}
      </g>
      <rect x="72" y="805" width="410" height="74" rx="28" fill="#071525"/><text x="277" y="853" text-anchor="middle" font-family="Inter,Arial" font-size="28" font-weight="950" fill="#fff">Transparent plans</text>`),
  },
  {
    file: "orva-16-website-traffic.png",
    svg: svgCard(`${base({ dark: true, number: "16", tag: "For websites and services" })}
      ${headlineBlock("Not Selling Products? Still Grow With ORVA", "Schedule marketing images, write captions, add CTAs, and drive people to your website or WhatsApp.", 72, 205, 560)}
      <g filter="url(#softShadow)">
        <rect x="630" y="255" width="345" height="420" rx="42" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.24)"/>
        <path d="M700 560c76-190 170-125 230-250" fill="none" stroke="#7df4ff" stroke-width="10" stroke-linecap="round"/>
        <path d="M905 318l42-23-4 48" fill="none" stroke="#7df4ff" stroke-width="10" stroke-linecap="round"/>
        ${[0,1,2,3].map((i) => `<rect x="${685 + i * 62}" y="${585 - i * 58}" width="42" height="${78 + i * 58}" rx="14" fill="${["#1b7cff", "#25D366", "#f59e0b", "#ec4899"][i]}"/>`).join("")}
      </g>
      <rect x="72" y="802" width="445" height="76" rx="28" fill="url(#blueGrad)" filter="url(#glow)"/><text x="294" y="851" text-anchor="middle" font-family="Inter,Arial" font-size="28" font-weight="950" fill="#fff">Get more enquiries</text>`),
  },
];

(async () => {
  for (const card of cards) {
    const out = path.join(outDir, card.file);
    await sharp(Buffer.from(card.svg)).png().toFile(out);
    console.log(out);
  }
})();
