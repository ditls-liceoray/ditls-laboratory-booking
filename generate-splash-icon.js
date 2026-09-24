const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const densities = [
  { name: 'mdpi', size: 48, folder: 'mipmap-mdpi' },
  { name: 'hdpi', size: 72, folder: 'mipmap-hdpi' },
  { name: 'xhdpi', size: 96, folder: 'mipmap-xhdpi' },
  { name: 'xxhdpi', size: 144, folder: 'mipmap-xxhdpi' },
  { name: 'xxxhdpi', size: 192, folder: 'mipmap-xxxhdpi' },
];

async function generateSplashIcons() {
  try {
    const metadata = await sharp('public/images/Ldcu_seal.png').metadata();
    console.log(`Source image: ${metadata.width}x${metadata.height}`);
    
    // For splash icon, we want the logo to be small (about 30-40% of the icon size)
    // Android's splash icon safe zone is 66% of the icon, but we want the logo
    // to be even smaller (around 30-40% of the icon) to have generous padding
    // This means the logo should be ~30-35% of the icon size
    // So for a 48x48 icon, logo should be ~16x16 to 19x19
    // For 48x48: logo ~16-19px (with ~12-16px padding on each side)
    
    for (const density of densities) {
      const outputDir = path.join('android/app/src/main/res', density.folder);
      const outputPath = path.join('android/app/src/main/res', density.folder, 'ic_splash_logo.png');
      
      // Ensure directory exists
      if (!fs.existsSync(path.join('android/app/src/main/res', density.folder))) {
        fs.mkdirSync(path.join('android/app/src/main/res', density.folder), { recursive: true });
      }
      
      // Calculate logo size - aim for ~28% of icon size (leaving ~36% padding on each side)
      // This gives us a small, clear logo with generous padding
      const iconSize = density.size;
      const logoRatio = 0.32; // 32% of canvas for the logo (leaves ~34% padding each side)
      const logoSize = Math.round(density.size * 0.28); // 28% of icon size for logo
      const padding = (density.size - Math.round(density.size * 0.28)) / 2;
      
      console.log(`Generating ${density.name}: ${density.size}x${density.size} (logo: ${Math.round(density.size * 0.28)}x${Math.round(density.size * 0.28)}, padding: ${padding}px)`);
      
      await sharp('public/images/Ldcu_seal.png')
        .resize(Math.round(density.size * 0.28), Math.round(density.size * 0.28), {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: Math.floor((density.size - Math.round(density.size * 0.28)) / 2),
          bottom: Math.ceil((density.size - Math.round(density.size * 0.28)) / 2),
          left: Math.floor((density.size - Math.round(density.size * 0.28)) / 2),
          right: Math.ceil((density.size - Math.round(density.size * 0.28)) / 2),
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .resize(density.size, density.size, {
          fit: 'contain',
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