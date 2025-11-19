#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const manifest = {
  "name": "Timelines - From Big Bang to Now",
  "short_name": "Timelines",
  "description": "Explore the complete timelines of the universe from the Big Bang to the present",
  "start_url": `${basePath}/`,
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": `${basePath}/icon-192x192.png`,
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": `${basePath}/icon-512x512.png`,
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
};

const outputPath = path.join(__dirname, '../public/manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`Generated manifest.json with basePath: ${basePath || '(none)'}`);
