import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AtlasFrame {
  frame: FrameRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: FrameRect;
  sourceSize: { w: number; h: number };
}

interface AtlasJson {
  frames: Record<string, AtlasFrame>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
  };
}

async function convertSpriteSheetToAtlas(
  inputPath: string,
  outPngPath: string,
  outJsonPath: string,
  frameW = 79,
  frameH = 79,
  stepX = 80,
  stepY = 80,
  cols = 10,
  maxFrames = 220
) {
  console.log(`Processing sprite sheet: ${inputPath}`);
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 1460;

  // Read raw RGBA pixels
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();

  // Color key: replace pure black (r=0, g=0, b=0) or near-black transparent border with alpha=0
  for (let i = 0; i < rawBuffer.length; i += 4) {
    const r = rawBuffer[i];
    const g = rawBuffer[i + 1];
    const b = rawBuffer[i + 2];
    if (r === 0 && g === 0 && b === 0) {
      rawBuffer[i + 3] = 0;
    }
  }

  const numRows = Math.floor(height / stepY);
  const totalFrames = Math.min(numRows * cols, maxFrames);

  // We can write out the processed sheet as a clean transparent atlas
  // And generate the atlas JSON mapping frame "pic" to coordinates
  const atlas: AtlasJson = {
    frames: {},
    meta: {
      app: 'LF Online Asset Pipeline',
      version: '1.0',
      image: path.basename(outPngPath),
      format: 'RGBA8888',
      size: { w: width, h: height },
      scale: '1',
    },
  };

  for (let f = 0; f < totalFrames; f++) {
    const col = f % cols;
    const row = Math.floor(f / cols);
    const fx = col * stepX;
    const fy = row * stepY;

    atlas.frames[f.toString()] = {
      frame: { x: fx, y: fy, w: frameW, h: frameH },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH },
      sourceSize: { w: frameW, h: frameH },
    };
  }

  // Save keyed image
  await sharp(rawBuffer, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outPngPath);

  fs.writeFileSync(outJsonPath, JSON.stringify(atlas, null, 2));
  console.log(`Wrote atlas: ${outPngPath} and ${outJsonPath} (${totalFrames} frames)`);
}

async function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('--- Starting LF Online Asset Build ---');
  const clientPublicDir = path.resolve(process.cwd(), 'packages/client/public/assets');
  const charOutDir = path.join(clientPublicDir, 'characters');
  const bgOutDir = path.join(clientPublicDir, 'bg');

  fs.mkdirSync(charOutDir, { recursive: true });
  fs.mkdirSync(bgOutDir, { recursive: true });

  // 1. Convert Davis
  const davisRaw = path.resolve(
    process.cwd(),
    'assets/raw/PC _ Computer - Little Fighter 2 - Playable Characters - Davis.png'
  );
  if (fs.existsSync(davisRaw)) {
    await convertSpriteSheetToAtlas(
      davisRaw,
      path.join(charOutDir, 'davis_atlas.png'),
      path.join(charOutDir, 'davis_atlas.json'),
      79,
      79,
      80,
      80,
      10,
      220
    );
  }

  // Copy Davis JSON definition
  const davisJsonSource = path.resolve(
    process.cwd(),
    'packages/shared/src/data/characters/davis.json'
  );
  if (fs.existsSync(davisJsonSource)) {
    fs.copyFileSync(davisJsonSource, path.join(charOutDir, 'davis.json'));
    console.log('Copied davis.json definition to client public assets');
  }

  // 2. Convert Dennis
  const dennisRaw = path.resolve(
    process.cwd(),
    'assets/raw/PC _ Computer - Little Fighter 2 - Playable Characters - Dennis.png'
  );
  if (fs.existsSync(dennisRaw)) {
    await convertSpriteSheetToAtlas(
      dennisRaw,
      path.join(charOutDir, 'dennis_atlas.png'),
      path.join(charOutDir, 'dennis_atlas.json'),
      79,
      79,
      80,
      80,
      10,
      220
    );
  }

  const dennisJsonSource = path.resolve(
    process.cwd(),
    'packages/shared/src/data/characters/dennis.json'
  );
  if (fs.existsSync(dennisJsonSource)) {
    fs.copyFileSync(dennisJsonSource, path.join(charOutDir, 'dennis.json'));
    console.log('Copied dennis.json definition to client public assets');
  }

  // 3. Copy Backgrounds
  const rawBgHkc = path.resolve(process.cwd(), 'assets/raw/bg/hkc');
  if (fs.existsSync(rawBgHkc)) {
    await copyDir(rawBgHkc, path.join(bgOutDir, 'hkc'));
    console.log('Copied HK Coliseum background assets');
  }

  const rawBgSp = path.resolve(process.cwd(), 'assets/raw/bg/sp');
  if (fs.existsSync(rawBgSp)) {
    await copyDir(rawBgSp, path.join(bgOutDir, 'sp'));
    console.log('Copied Stanley Prison background assets');
  }

  // Copy shadow to shared assets
  const shadowHkc = path.join(bgOutDir, 'hkc/s.png');
  if (fs.existsSync(shadowHkc)) {
    fs.copyFileSync(shadowHkc, path.join(clientPublicDir, 'shadow.png'));
    console.log('Copied shadow.png to client assets');
  }

  // 4. Generate Radiant Energy Ball Projectile Sprite
  const ballSize = 32;
  const ballBuffer = Buffer.alloc(ballSize * ballSize * 4);
  const bcx = 16;
  const bcy = 16;
  const brMax = 14;

  for (let y = 0; y < ballSize; y++) {
    for (let x = 0; x < ballSize; x++) {
      const idx = (y * ballSize + x) * 4;
      const dist = Math.hypot(x - bcx, y - bcy);
      if (dist > brMax) {
        ballBuffer[idx] = 0;
        ballBuffer[idx + 1] = 0;
        ballBuffer[idx + 2] = 0;
        ballBuffer[idx + 3] = 0;
      } else {
        const norm = dist / brMax;
        const alpha = Math.floor(Math.pow(1 - norm, 0.7) * 255);
        const r = Math.floor(Math.max(0, 255 * (1 - norm * 1.5)));
        const g = Math.floor(Math.max(100, 240 * (1 - norm * 0.7)));
        const b = 255;
        ballBuffer[idx] = r;
        ballBuffer[idx + 1] = g;
        ballBuffer[idx + 2] = b;
        ballBuffer[idx + 3] = alpha;
      }
    }
  }

  await sharp(ballBuffer, { raw: { width: ballSize, height: ballSize, channels: 4 } })
    .png()
    .toFile(path.join(clientPublicDir, 'energy_ball.png'));
  console.log('Generated energy_ball.png projectile asset');

  console.log('--- Asset Pipeline Finished Successfully ---');
}

main().catch((err) => {
  console.error('Asset pipeline failed:', err);
  process.exit(1);
});
