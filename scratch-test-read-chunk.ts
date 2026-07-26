import fs from 'fs';
import path from 'path';

async function main() {
  const filePath = 'C:\\Node\\test\\new-custodia\\.next\\static\\chunks\\16z8vx1u.nfkw.js';
  if (!fs.existsSync(filePath)) {
    console.error("File does not exist:", filePath);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  console.log(`File has ${lines.length} lines.`);
  // Line 7 is index 6
  const line7 = lines[6];
  if (!line7) {
    console.error("Line 7 does not exist!");
    return;
  }
  console.log(`Line 7 length: ${line7.length}`);
  // Extract 100 characters before and after column 11108 (which is 11107 in 0-indexed string)
  const colIndex = 11108;
  const start = Math.max(0, colIndex - 150);
  const end = Math.min(line7.length, colIndex + 150);
  console.log("Snippet around col 11108:");
  console.log(line7.substring(start, end));
}

main().catch(console.error);
