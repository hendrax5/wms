const fs = require('fs');
const path = require('path');

const dir = 'src/app/actions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts')).map(f => path.join(dir, f));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  const regex = /await\s+prisma\.\$transaction\s*\(\s*async\s*\(([^)]*)\)\s*=>\s*\{/g;
  let matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
      matches.push({ index: match.index, length: match[0].length });
  }
  
  // Process backwards to keep indices valid
  for (let i = matches.length - 1; i >= 0; i--) {
      let m = matches[i];
      let bracketCount = 1;
      let pos = m.index + m.length;
      for (; pos < content.length; pos++) {
          if (content[pos] === '{') bracketCount++;
          if (content[pos] === '}') {
              bracketCount--;
              if (bracketCount === 0) {
                  break;
              }
          }
      }
      
      if (bracketCount === 0) {
          const nextChars = content.substring(pos + 1, pos + 20).trim();
          if (nextChars.startsWith(',')) {
              console.log(`File ${file} already has options at index ${pos}`);
          } else {
              content = content.substring(0, pos + 1) + ', { maxWait: 20000, timeout: 300000 }' + content.substring(pos + 1);
          }
      }
  }
  
  if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
  }
}
