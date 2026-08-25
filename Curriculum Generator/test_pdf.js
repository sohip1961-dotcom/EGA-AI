const fs = require("fs");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

async function test() {
  const filePath = path.join(__dirname, "uploads", "file_1785482750508_gq4x7_1-since.pdf");
  console.log("Testing file:", filePath);
  if (!fs.existsSync(filePath)) {
    console.error("File not found!");
    return;
  }

  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    disableWorker: true,
    isEvalSupported: false,
  });

  const pdfDoc = await loadingTask.promise;
  console.log("Total Pages:", pdfDoc.numPages);

  for (let i = 1; i <= Math.min(20, pdfDoc.numPages); i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map((item) => item.str || "");
    const pageText = textItems.join(" ").trim();
    console.log(`Page ${i}: text length = ${pageText.length}`);
    if (pageText.length > 0) {
      console.log(`  Sample: "${pageText.substring(0, 100)}..."`);
    }
  }
}

test().catch(console.error);
