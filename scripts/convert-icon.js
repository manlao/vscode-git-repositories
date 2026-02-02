#!/usr/bin/env node

/**
 * SVG to PNG Converter Script
 *
 * This script converts icon.svg to icon.png (128x128) for VSCode Marketplace.
 *
 * Installation:
 *   npm install --save-dev sharp
 *
 * Usage:
 *   node scripts/convert-icon.js
 */

const fs = require("fs");
const path = require("path");

async function convertSvgToPng() {
  try {
    // Try to load sharp
    let sharp;
    try {
      sharp = require("sharp");
    } catch (err) {
      console.error("❌ Error: sharp is not installed");
      console.log("\nPlease install sharp first:");
      console.log("  npm install --save-dev sharp");
      console.log("\nThen run this script again:");
      console.log("  node scripts/convert-icon.js");
      process.exit(1);
    }

    const svgPath = path.join(__dirname, "..", "icon.svg");
    const pngPath = path.join(__dirname, "..", "icon.png");

    // Check if SVG exists
    if (!fs.existsSync(svgPath)) {
      console.error(`❌ Error: ${svgPath} not found`);
      process.exit(1);
    }

    console.log("📦 Converting icon.svg to icon.png...");

    // Convert SVG to PNG
    await sharp(svgPath).resize(128, 128).png().toFile(pngPath);

    console.log("✅ Successfully created icon.png (128x128)");

    // Show file size
    const stats = fs.statSync(pngPath);
    console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error("❌ Error converting icon:", error.message);
    process.exit(1);
  }
}

// Run conversion
convertSvgToPng();
