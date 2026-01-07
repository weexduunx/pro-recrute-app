const fs = require('fs');
const path = require('path');

/**
 * Script pour convertir automatiquement les shadow* props vers createShadow
 * Usage: node scripts/fix-shadows.js
 */

// Files to process (most common ones causing warnings)
const filesToProcess = [
  'app/(auth)/index.tsx',
  'components/CustomHeader.tsx',
  'app/(app)/dashboard.tsx',
  'app/(app)/actualites/index.tsx',
];

const rootDir = path.resolve(__dirname, '..');

function fixShadowsInFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // Check if createShadow import already exists
  if (!content.includes("import { createShadow }") && !content.includes("import { shadows, createShadow }")) {
    // Add import after other imports
    const importRegex = /(import.*from ['"][^'"]+['"];?\n)/g;
    let lastImportIndex = 0;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    
    if (lastImportIndex > 0) {
      const beforeImports = content.substring(0, lastImportIndex);
      const afterImports = content.substring(lastImportIndex);
      const shadowImport = "import { createShadow } from '../utils/shadow-utils';\n";
      
      // Adjust relative path based on file depth
      const depth = filePath.split('/').length - 1;
      const relativePath = '../'.repeat(depth) + 'utils/shadow-utils';
      const adjustedImport = `import { createShadow } from '${relativePath}';\n`;
      
      content = beforeImports + adjustedImport + afterImports;
      changed = true;
    }
  }

  // Replace shadow style objects
  const shadowPattern = /shadowColor:\s*['"][^'"]*['"],?\s*shadowOffset:\s*\{[^}]+\},?\s*shadowOpacity:\s*[\d.]+,?\s*shadowRadius:\s*[\d.]+,?(\s*elevation:\s*[\d.]+,?)?/g;
  
  content = content.replace(shadowPattern, (match) => {
    // Extract values from the match
    const shadowColorMatch = match.match(/shadowColor:\s*['"]([^'"]*)['"],?/);
    const shadowOffsetMatch = match.match(/shadowOffset:\s*\{\s*width:\s*([-\d.]+),\s*height:\s*([-\d.]+)\s*\},?/);
    const shadowOpacityMatch = match.match(/shadowOpacity:\s*([\d.]+),?/);
    const shadowRadiusMatch = match.match(/shadowRadius:\s*([\d.]+),?/);
    const elevationMatch = match.match(/elevation:\s*([\d.]+),?/);
    
    if (shadowColorMatch && shadowOffsetMatch && shadowOpacityMatch && shadowRadiusMatch) {
      const shadowColor = shadowColorMatch[1];
      const width = shadowOffsetMatch[1];
      const height = shadowOffsetMatch[2];
      const opacity = shadowOpacityMatch[1];
      const radius = shadowRadiusMatch[1];
      const elevation = elevationMatch ? elevationMatch[1] : null;
      
      let replacement = `...createShadow({
      shadowColor: '${shadowColor}',
      shadowOffset: { width: ${width}, height: ${height} },
      shadowOpacity: ${opacity},
      shadowRadius: ${radius},`;
      
      if (elevation) {
        replacement += `\n      elevation: ${elevation},`;
      }
      
      replacement += '\n    }),';
      
      changed = true;
      return replacement;
    }
    
    return match;
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed shadows in: ${filePath}`);
  } else {
    console.log(`⚪ No changes needed: ${filePath}`);
  }
}

console.log('🔧 Fixing shadow props for web compatibility...\n');

filesToProcess.forEach(filePath => {
  fixShadowsInFile(filePath);
});

console.log('\n✨ Shadow conversion complete!');
console.log('💡 Tip: Run this script on other files as needed.');