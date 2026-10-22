import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateNativeIcons() {
  const iconSrc = path.resolve(__dirname, '../resources/icon.png');
  const splashSrc = path.resolve(__dirname, '../resources/splash.png');

  if (!fs.existsSync(iconSrc) || !fs.existsSync(splashSrc)) {
    console.error('Missing resources/icon.png or resources/splash.png');
    process.exit(1);
  }

  // 1. Android Mipmaps
  const androidRes = path.resolve(__dirname, '../android/app/src/main/res');
  const androidSizes: Record<string, number> = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };

  for (const [folder, size] of Object.entries(androidSizes)) {
    const dir = path.join(androidRes, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await sharp(iconSrc)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    await sharp(iconSrc)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    await sharp(iconSrc)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  console.log('✓ Android launcher icons updated');

  // Android Splash
  const drawableDir = path.join(androidRes, 'drawable');
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
  await sharp(splashSrc)
    .resize(1920, 1080, { fit: 'cover' })
    .png()
    .toFile(path.join(drawableDir, 'splash.png'));
  console.log('✓ Android splash updated');

  // 2. iOS AppIcon
  const iosIconDir = path.resolve(
    __dirname,
    '../ios/App/App/Assets.xcassets/AppIcon.appiconset'
  );
  if (fs.existsSync(iosIconDir)) {
    await sharp(iconSrc)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(iosIconDir, 'AppIcon-512@2x.png'));
    console.log('✓ iOS AppIcon-512@2x.png updated');
  }

  // iOS Splash
  const iosSplashDir = path.resolve(
    __dirname,
    '../ios/App/App/Assets.xcassets/Splash.imageset'
  );
  if (!fs.existsSync(iosSplashDir)) fs.mkdirSync(iosSplashDir, { recursive: true });
  await sharp(splashSrc)
    .resize(2732, 2732)
    .png()
    .toFile(path.join(iosSplashDir, 'splash.png'));
  console.log('✓ iOS Splash.imageset updated');
}

generateNativeIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
