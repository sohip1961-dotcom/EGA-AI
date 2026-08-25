import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import fs from "fs";

export interface PDFPageContent {
  pageNumber: number;
  extractedText: string;
  hasText: boolean;
  imageBuffer: Buffer | null;
  mimeType: string;
}

export class PDFDocumentHandler {
  private pdfDoc: any = null;
  private filePath: string;
  private totalPages: number = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  public async init(): Promise<number> {
    try {
      const fileBuffer = fs.readFileSync(this.filePath);
      const data = new Uint8Array(fileBuffer);
      const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
        disableWorker: true,
        isEvalSupported: false,
      } as any);

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      return this.totalPages;
    } catch (error: any) {
      console.warn(`Fallback page count for ${this.filePath}:`, error.message);
      try {
        const fileBuffer = fs.readFileSync(this.filePath);
        const pdfString = fileBuffer.toString("binary");
        const matches = pdfString.match(/\/Type\s*\/Page\b/g);
        this.totalPages = matches && matches.length > 0 ? matches.length : 1;
        return this.totalPages;
      } catch {
        this.totalPages = 1;
        return 1;
      }
    }
  }

  public getNumPages(): number {
    return this.totalPages;
  }

  public async extractPage(pageNumber: number): Promise<PDFPageContent> {
    if (!this.pdfDoc) {
      await this.init();
    }

    if (pageNumber < 1 || (this.totalPages > 0 && pageNumber > this.totalPages)) {
      throw new Error(`Page ${pageNumber} out of range (1-${this.totalPages})`);
    }

    let page: any = null;
    try {
      page = await this.pdfDoc.getPage(pageNumber);

      // 1. Digital text layer extraction
      let pageText = "";
      try {
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str || "");
        pageText = textItems.join(" ").trim();
      } catch (textErr: any) {
        console.warn(`Text extraction warning on page ${pageNumber}:`, textErr.message);
      }

      // 2. High-speed image extraction
      let imageBuffer: Buffer | null = null;

      try {
        const operatorList = await page.getOperatorList();
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const fn = operatorList.fnArray[i];
          const args = operatorList.argsArray[i];

          if (
            fn === pdfjsLib.OPS.paintImageXObject ||
            fn === pdfjsLib.OPS.paintInlineImageXObject ||
            fn === (pdfjsLib.OPS as any).paintJpegXObject ||
            fn === (pdfjsLib.OPS as any).paintXObject
          ) {
            const imgName = args[0];
            const imgObj = await new Promise<any>((resolve) => {
              page.objs.get(imgName, (obj: any) => resolve(obj));
            });

            if (imgObj && imgObj.width && imgObj.height && imgObj.data) {
              const canvas = createCanvas(imgObj.width, imgObj.height);
              const ctx = canvas.getContext("2d");
              const imgData = ctx.createImageData(imgObj.width, imgObj.height);

              const srcData = imgObj.data;
              const destData = imgData.data;

              if (srcData.length === imgObj.width * imgObj.height * 4) {
                destData.set(srcData);
              } else if (srcData.length === imgObj.width * imgObj.height * 3) {
                let j = 0;
                for (let k = 0; k < srcData.length; k += 3) {
                  destData[j] = srcData[k];
                  destData[j + 1] = srcData[k + 1];
                  destData[j + 2] = srcData[k + 2];
                  destData[j + 3] = 255;
                  j += 4;
                }
              } else if (srcData.length === imgObj.width * imgObj.height) {
                let j = 0;
                for (let k = 0; k < srcData.length; k++) {
                  const val = srcData[k];
                  destData[j] = val;
                  destData[j + 1] = val;
                  destData[j + 2] = val;
                  destData[j + 3] = 255;
                  j += 4;
                }
              }

              ctx.putImageData(imgData, 0, 0);
              imageBuffer = canvas.toBuffer("image/jpeg");
              break;
            }
          }
        }
      } catch (imgErr: any) {
        console.warn(`Image extraction warning on page ${pageNumber}:`, imgErr.message);
      }

      return {
        pageNumber,
        extractedText: pageText,
        hasText: pageText.length > 25,
        imageBuffer,
        mimeType: "image/jpeg",
      };
    } catch (error: any) {
      console.error(`Error in extractPage(${pageNumber}):`, error.message);
      return {
        pageNumber,
        extractedText: "",
        hasText: false,
        imageBuffer: null,
        mimeType: "image/jpeg",
      };
    } finally {
      if (page && typeof page.cleanup === "function") {
        try {
          page.cleanup();
        } catch {}
      }
    }
  }

  public async destroy(): Promise<void> {
    if (this.pdfDoc && typeof this.pdfDoc.destroy === "function") {
      try {
        await this.pdfDoc.destroy();
      } catch {}
    }
    this.pdfDoc = null;
  }
}

export async function getPDFTotalPages(filePathOrBuffer: string | Buffer): Promise<number> {
  try {
    const data =
      typeof filePathOrBuffer === "string"
        ? new Uint8Array(fs.readFileSync(filePathOrBuffer))
        : new Uint8Array(filePathOrBuffer);

    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      disableWorker: true,
      isEvalSupported: false,
    } as any);

    const pdfDoc = await loadingTask.promise;
    const count = pdfDoc.numPages;
    try {
      await pdfDoc.destroy();
    } catch {}
    return count;
  } catch (error: any) {
    console.warn("getPDFTotalPages fallback count:", error.message);
    try {
      const buffer =
        typeof filePathOrBuffer === "string"
          ? fs.readFileSync(filePathOrBuffer)
          : filePathOrBuffer;
      const pdfString = buffer.toString("binary");
      const matches = pdfString.match(/\/Type\s*\/Page\b/g);
      return matches && matches.length > 0 ? matches.length : 1;
    } catch {
      return 1;
    }
  }
}
