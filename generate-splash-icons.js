const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const densities = [
  { name: 'mdpi', size: 48, folder: 'drawable-mdpi' },
  { name: 'hdpi', size: 72, folder: 'drawable-hdpi' },
  { name: 'xhdpi', size: 96, folder: 'drawable-xhdpi' },
  { name: 'xxhdpi', size: 144, folder: 'drawable-xxhdpi' },
  { name: 'xxxhdpi', size: 192, folder: 'drawable-xxxhdpi' },
];

async function generateIcons() {
  try {
    const metadata = await sharp('public/images/Ldcu_seal.png').metadata();
    console.log(`Source image: ${metadata.width}x${metadata.height}`);
    
    for (const density of densities) {
      const outputDir = path.join('android/app/src/main/res', density.folder);
      const outputPath = path.join('android/app/src/main/res', density.folder, 'ic_splash_logo.png');
      
      if (!fs.existsSync(path.join('android/app/src/main/res', density.folder))) {
        fs.mkdirSync(path.join('android/app/src/main/res', density.folder), { recursive: true });
      }
      
      const iconSize = density.size;
      const logoRatio = 0.28; // 28% of canvas for logo (leaves ~36% padding each side)
      const logoSize = Math.round(density.size * 0.28);
      const padding = (density.size - logoSize) / 2;
      
      console.log(`Generating ${density.name}: ${density.size}x${density.size} (logo: ${logoSize}x${logoSize}, padding: ${padding}px)`);
      
      await sharp('public/images/Ldcu_seal.png')
        .resize(Math.round(density.size * 0.28), Math.round(density.size * 0.28), {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: Math.floor((density.size - logoSize) / 2),
          bottom: Math.ceil((density.size - logoSize) / 2),
          left: Math.floor((density.size - logoSize) / 2),
          right: Math.ceil((density.size - logoSize) / 2),
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join('android/app/src/main/res', density.folder, 'ic_splash_logo.png'));
      
      console.log(`Generated ${density.folder}/ic_splash_logo.png (${density.size}x${density.size})`);
    }
    
    console.log('\nAll splash icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();