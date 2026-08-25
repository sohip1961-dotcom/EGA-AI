import fs from "fs";
import path from "path";
import { getPDFTotalPages, extractPageText } from "../Curriculum Generator/src/lib/pdf_parser";

async function testPdf() {
  const filePath = "C:\\myapp\\Curriculum Generator\\uploads\\file_1785482750508_gq4x7_1-since.pdf";
  if (!fs.existsSync(filePath)) {
    console.error("File does not exist at:", filePath);
    // Search uploads directory
    const uploadsDir = "C:\\myapp\\Curriculum Generator\\uploads";
    if (fs.existsSync(uploadsDir)) {
      console.log("Uploads dir files:", fs.readdirSync(uploadsDir));
    }
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const totalPages = await getPDFTotalPages(buffer);
  console.log("Total pages:", totalPages);

  for (let p = 1; p <= Math.min(5, totalPages); p++) {
    const res = await extractPageText(buffer, p);
    console.log(`--- PAGE ${p} (length: ${res.extractedText.length}) ---`);
    console.log(res.extractedText.substring(0, 200));
  }
}

testPdf().catch(console.error);
