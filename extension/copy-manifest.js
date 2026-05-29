import fs from 'fs';
import path from 'path';

const filesToCopy = [
  'manifest.json',
  'icon16.png',
  'icon32.png',
  'icon48.png',
  'icon128.png'
];

try {
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  for (const filename of filesToCopy) {
    const src = path.resolve(filename);
    const dest = path.join(distDir, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Successfully copied ${filename} to dist/${filename}`);
    }
  }
} catch (err) {
  console.error('Failed during build asset copying:', err);
  process.exit(1);
}

