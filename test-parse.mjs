import fs from 'fs';
import { PDFParse } from 'pdf-parse';

async function test() {
    const buffer = fs.readFileSync('public/paycheck/SSPUSADV (1).pdf');
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const lines = textResult.text.split("\n");
    console.log("Total lines:", lines.length);
    for (let i = 0; i < Math.min(100, lines.length); i++) {
        console.log(lines[i]);
    }
}
test();
