import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateMobileAssets() {
  const outDir = path.resolve(__dirname, '../resources');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Generate 1024x1024 App Icon
  const iconSvg = `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#121418"/>
        <stop offset="100%" stop-color="#0a0a0c"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f0d07b"/>
        <stop offset="100%" stop-color="#e5c07b"/>
      </linearGradient>
      <linearGradient id="blueGlow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#61afef"/>
        <stop offset="100%" stop-color="#2d72d9"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
    <circle cx="512" cy="512" r="390" fill="none" stroke="url(#gold)" stroke-width="24" stroke-opacity="0.85"/>
    <circle cx="512" cy="512" r="340" fill="#181a1f" stroke="#3d4552" stroke-width="8"/>
    <!-- Fighter Fist / Dragon Symbol Placeholder -->
    <path d="M 400 350 L 624 350 L 660 450 L 512 680 L 364 450 Z" fill="url(#blueGlow)" opacity="0.9"/>
    <text x="512" y="520" font-family="monospace, sans-serif" font-size="110" font-weight="900" fill="#ffffff" text-anchor="middle">LF</text>
    <text x="512" y="605" font-family="monospace, sans-serif" font-size="44" font-weight="bold" fill="url(#gold)" text-anchor="middle" letter-spacing="8">ONLINE</text>
  </svg>
  `;

  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(path.join(outDir, 'icon.png'));

  console.log('✓ Generated resources/icon.png (1024x1024)');

  // 2. Generate 2732x2732 Splash Screen
  const splashSvg = `
  <svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
    <rect width="2732" height="2732" fill="#0a0a0c"/>
    <circle cx="1366" cy="1366" r="600" fill="#121418" stroke="#e5c07b" stroke-width="12" stroke-opacity="0.6"/>
    <path d="M 1200 1150 L 1532 1150 L 1580 1280 L 1366 1600 L 1152 1280 Z" fill="#61afef" opacity="0.85"/>
    <text x="1366" y="1370" font-family="monospace, sans-serif" font-size="150" font-weight="900" fill="#ffffff" text-anchor="middle">LF</text>
    <text x="1366" y="1480" font-family="monospace, sans-serif" font-size="64" font-weight="bold" fill="#e5c07b" text-anchor="middle" letter-spacing="12">ONLINE</text>
    <text x="1366" y="1720" font-family="monospace, sans-serif" font-size="34" fill="#abb2bf" text-anchor="middle" letter-spacing="4">2.5D CROSS-PLATFORM MULTIPLAYER FIGHTING ENGINE</text>
  </svg>
  `;

  await sharp(Buffer.from(splashSvg))
    .png()
    .toFile(path.join(outDir, 'splash.png'));

  console.log('✓ Generated resources/splash.png (2732x2732)');
}

generateMobileAssets().catch(err => {
  console.error(err);
  process.exit(1);
});
