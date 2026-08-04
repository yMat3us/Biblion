import fs from 'fs';
import { PDFParse } from 'pdf-parse';

async function run() {
  // Let's create a dummy PDF just to test if PDFParse fails instantly
  const buffer = fs.readFileSync('package.json'); // not a pdf
  
  try {
    const parser = new PDFParse({ data: buffer });
    await parser.getText();
  } catch(e) {
    console.error("EXPECTED ERROR:", e);
  }
}
run();
