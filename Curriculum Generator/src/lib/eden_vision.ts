export interface EdenVisionOptions {
  apiKey?: string;
  maxRetries?: number;
  onNetworkWait?: (attempt: number, maxRetries: number, delayMs: number) => void;
}

const DEFAULT_EDENAI_KEY = process.env.EDENAI_API_KEY || "";

export async function extractWithEdenAI(
  extractedText: string,
  imageBuffer: Buffer | null,
  options: EdenVisionOptions
): Promise<string> {
  const rawKey = options.apiKey || process.env.EDENAI_API_KEY || DEFAULT_EDENAI_KEY;
  const cleanKey = rawKey.replace(/^Bearer\s+/i, "").trim();

  const maxRetries = options.maxRetries ?? 8;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      if (imageBuffer && imageBuffer.length > 0) {
        // Step 1: EdenAI Document OCR API (Primary)
        try {
          const fileBlob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("providers", "google");
          formData.append("fallback_providers", "amazon,microsoft");
          formData.append("file", fileBlob, "page.jpg");
          formData.append("language", "ar");

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          const ocrResponse = await fetch("https://api.edenai.run/v2/ocr/ocr", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cleanKey}`,
            },
            body: formData,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));

          if (ocrResponse.ok) {
            const ocrData = await ocrResponse.json();
            const ocrText =
              ocrData?.google?.text ||
              ocrData?.amazon?.text ||
              ocrData?.microsoft?.text ||
              "";

            if (ocrText && ocrText.trim().length > 0) {
              return ocrText.trim();
            }
          }
        } catch (ocrErr: any) {
          console.warn("EdenAI OCR endpoint note:", ocrErr.message);
        }

        // Step 2: Fallback to EdenAI VQA API (Detailed Vision analysis)
        try {
          const fileBlob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("providers", "google");
          formData.append("fallback_providers", "openai");
          formData.append("file", fileBlob, "page.jpg");
          formData.append(
            "question",
            "Read this textbook page in its entirety. Transcribe all text, explanations, formulas, equations, headings, and instructional details with extreme precision in the exact original language of the page (Arabic/English/etc.) without omitting any educational information."
          );

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          const vqaResponse = await fetch("https://api.edenai.run/v2/image/question_answer", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cleanKey}`,
            },
            body: formData,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));

          if (vqaResponse.ok) {
            const vqaData = await vqaResponse.json();
            const googleAnswers = vqaData?.google?.answers;
            const openaiAnswers = vqaData?.openai?.answers;

            const description =
              (googleAnswers && googleAnswers.length > 0 ? googleAnswers[0] : null) ||
              (openaiAnswers && openaiAnswers.length > 0 ? openaiAnswers[0] : null) ||
              vqaData?.google?.answer ||
              vqaData?.openai?.answer ||
              "";

            if (description && description.trim().length > 0 && !description.includes("عذرًا")) {
              return description.trim();
            }
          }
        } catch (vqaErr: any) {
          console.warn("EdenAI VQA endpoint note:", vqaErr.message);
        }
      }

      // Step 3: Fallback to text extracted directly from PDF structure
      if (extractedText && extractedText.trim().length > 0) {
        return extractedText.trim();
      }

      // If page is blank or cover page without text, return empty string
      return "";
    } catch (error: any) {
      const isNetworkError =
        error.name === "AbortError" ||
        error.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("fetch failed") ||
        error.message?.includes("Timeout");

      const delayMs = Math.min(2000 * Math.pow(1.8, attempt - 1), 30000);

      if (options.onNetworkWait) {
        options.onNetworkWait(attempt, maxRetries, delayMs);
      }

      console.warn(
        `EdenAI attempt ${attempt}/${maxRetries} (${
          isNetworkError ? "انقطاع أو بطء في الشبكة" : error.message
        }) - إعادة المحاولة بعد ${Math.round(delayMs / 1000)} ثوانٍ...`
      );

      if (attempt >= maxRetries) {
        if (extractedText && extractedText.trim().length > 0) {
          return extractedText.trim();
        }
        throw new Error(`فشل استخراج النصوص بعد ${maxRetries} محاولات: ${error.message}`);
      }

      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  return extractedText ? extractedText.trim() : "";
}
