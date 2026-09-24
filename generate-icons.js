const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = 'public/images/Ldcu_seal.png';
const resourceRoot = 'android/app/src/main/res';

const launcherDensities = [
  { name: 'mdpi', size: 48, folder: 'mipmap-mdpi' },
  { name: 'hdpi', size: 72, folder: 'mipmap-hdpi' },
  { name: 'xhdpi', size: 96, folder: 'mipmap-xhdpi' },
  { name: 'xxhdpi', size: 144, folder: 'mipmap-xxhdpi' },
  { name: 'xxxhdpi', size: 192, folder: 'mipmap-xxxhdpi' },
];

const splashDensities = [
  { name: 'mdpi', size: 48, folder: 'drawable-mdpi' },
  { name: 'hdpi', size: 72, folder: 'drawable-hdpi' },
  { name: 'xhdpi', size: 96, folder: 'drawable-xhdpi' },
  { name: 'xxhdpi', size: 144, folder: 'drawable-xxhdpi' },
  { name: 'xxxhdpi', size: 192, folder: 'drawable-xxxhdpi' },
];

const LAUNCHER_LOGO_RATIO = 0.55;
const SPLASH_LOGO_RATIO = 0.75;

async function generateLogo({
  density,
  ratio,
  outputName,
}) {
  const outputDir = path.join(resourceRoot, density.folder);
  const outputPath = path.join(outputDir, outputName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const logoSize = Math.round(density.size * ratio);
  const totalPadding = density.size - logoSize;

  const top = Math.floor(totalPadding / 2);
  const bottom = Math.ceil(totalPadding / 2);
  const left = Math.floor(totalPadding / 2);
  const right = Math.ceil(totalPadding / 2);

  console.log(
    `Generating ${ outputName } - ${ density.name }: ` +
      `${ density.size }x${ density.size } ` +
      `(logo: ${ logoSize }x${ logoSize }, ` +
      `padding: ${ left }px / ${ right }px / ${ top }px / ${ bottom }px)`,
  );

  await sharp(sourceImage)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    })
    .extend({
      top,
      bottom,
      left,
      right,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    })
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${ outputPath } `);
}

async function generateIcons() {
  try {
    const metadata = await sharp(sourceImage).metadata();

    console.log(
      `Source image: ${ metadata.width }x${ metadata.height } `,
    );

    console.log('\n--- Generating launcher icons ---');

    for (const density of launcherDensities) {
      await generateLogo({
        density,
        ratio: LAUNCHER_LOGO_RATIO,
        outputName: 'ic_launcher_foreground.png',
      });
    }

    console.log('\n--- Generating splash icons ---');

    for (const density of splashDensities) {
      await generateLogo({
        density,
        ratio: SPLASH_LOGO_RATIO,
        outputName: 'ic_splash_logo.png',
      });
    }

    console.log('\nAll icons generated successfully!');
    console.log(`Launcher logo ratio: ${ LAUNCHER_LOGO_RATIO * 100 }% `);
    console.log(`Splash logo ratio: ${ SPLASH_LOGO_RATIO * 100 }% `);
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
