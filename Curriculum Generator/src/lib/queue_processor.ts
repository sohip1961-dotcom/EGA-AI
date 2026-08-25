import fs from "fs";
import path from "path";
import {
  FileQueueItem,
  FileStatus,
  ProcessingSettings,
  PageExtractionResult,
  ProcessingLog,
  GradeLevel,
} from "./types";
import { PDFDocumentHandler, getPDFTotalPages } from "./pdf_parser";
import { extractWithEdenAI } from "./eden_vision";
import { organizeTextWithDeepSeek } from "./deepseek_organizer";
import {
  initCheckpoint,
  loadCheckpoint,
  savePageResult,
  saveQueueState,
  loadQueueState,
  deleteCheckpoint,
} from "./checkpoint_manager";

const OUTPUT_DIR = path.join(process.cwd(), "output");

function ensureOutputDir(gradeLevel: GradeLevel): string {
  const stageDir = path.join(OUTPUT_DIR, gradeLevel);
  if (!fs.existsSync(stageDir)) {
    fs.mkdirSync(stageDir, { recursive: true });
  }
  return stageDir;
}

const DEFAULT_EDENAI_KEY = process.env.EDENAI_API_KEY || "";
const DEFAULT_DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

export class QueueProcessor {
  private queue: FileQueueItem[] = [];
  private settings: ProcessingSettings;
  private isProcessing = false;
  private isPaused = false;
  private logs: ProcessingLog[] = [];
  private activeWorkers = 0;
  private onLogCallback?: (log: ProcessingLog) => void;
  private onProgressCallback?: (queue: FileQueueItem[]) => void;

  constructor(defaultSettings: ProcessingSettings) {
    this.settings = {
      ...defaultSettings,
      edenAiApiKey:
        defaultSettings.edenAiApiKey || process.env.EDENAI_API_KEY || DEFAULT_EDENAI_KEY,
      deepSeekApiKey:
        defaultSettings.deepSeekApiKey || process.env.DEEPSEEK_API_KEY || DEFAULT_DEEPSEEK_KEY,
    };
    this.restoreSavedState();
  }

  private restoreSavedState() {
    try {
      const saved = loadQueueState();
      if (saved) {
        if (saved.settings) {
          this.settings = {
            ...this.settings,
            ...saved.settings,
            edenAiApiKey:
              saved.settings.edenAiApiKey ||
              this.settings.edenAiApiKey ||
              process.env.EDENAI_API_KEY ||
              DEFAULT_EDENAI_KEY,
            deepSeekApiKey:
              saved.settings.deepSeekApiKey ||
              this.settings.deepSeekApiKey ||
              process.env.DEEPSEEK_API_KEY ||
              DEFAULT_DEEPSEEK_KEY,
          };
        }
        if (Array.isArray(saved.queue) && saved.queue.length > 0) {
          // Normalize status of restored queue items
          this.queue = saved.queue.map((f) => {
            if (f.status === "processing") {
              f.status = "paused";
            }
            return f;
          });
          this.log(
            "info",
            `تمت استعادة ${this.queue.length} كتب من سجل المحفوظات بنجاح.`
          );
        }
      }
    } catch (err: any) {
      console.warn("Failed to restore saved queue state:", err.message);
    }
  }

  public persistState() {
    saveQueueState(this.queue, this.settings);
  }

  public updateSettings(newSettings: Partial<ProcessingSettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
      edenAiApiKey:
        newSettings.edenAiApiKey ||
        this.settings.edenAiApiKey ||
        process.env.EDENAI_API_KEY ||
        DEFAULT_EDENAI_KEY,
      deepSeekApiKey:
        newSettings.deepSeekApiKey ||
        this.settings.deepSeekApiKey ||
        process.env.DEEPSEEK_API_KEY ||
        DEFAULT_DEEPSEEK_KEY,
    };
    this.persistState();
  }

  public getSettings(): ProcessingSettings {
    return { ...this.settings };
  }

  public setCallbacks(
    onLog?: (log: ProcessingLog) => void,
    onProgress?: (queue: FileQueueItem[]) => void
  ) {
    this.onLogCallback = onLog;
    this.onProgressCallback = onProgress;
  }

  public addFile(fileItem: FileQueueItem) {
    this.queue.push(fileItem);
    this.log("info", `تمت إضافة المنهج إلى القائمة: ${fileItem.subjectName} (${fileItem.filename})`, fileItem.id);
    this.persistState();
    this.notifyProgress();
  }

  public addFiles(fileItems: FileQueueItem[]) {
    for (const f of fileItems) {
      this.queue.push(f);
    }
    this.log("info", `تمت إضافة ${fileItems.length} كتب دراسية إلى قائمة الانتظار.`);
    this.persistState();
    this.notifyProgress();
  }

  public deleteFile(fileId: string) {
    const item = this.queue.find((f) => f.id === fileId);
    if (item && item.status === "processing") {
      item.status = "paused";
    }
    this.queue = this.queue.filter((f) => f.id !== fileId);
    deleteCheckpoint(fileId);
    this.persistState();
    this.notifyProgress();
    this.log("info", `تم حذف المنهج من القائمة.`, fileId);
  }

  public clearCompleted() {
    this.queue = this.queue.filter((f) => f.status !== "completed");
    this.persistState();
    this.notifyProgress();
    this.log("info", "تم مسح المناهج المكتملة من القائمة.");
  }

  public getQueue(): FileQueueItem[] {
    return [...this.queue];
  }

  public getLogs(): ProcessingLog[] {
    return [...this.logs];
  }

  public pause() {
    this.isPaused = true;
    for (const item of this.queue) {
      if (item.status === "processing") {
        item.status = "paused";
      }
    }
    this.persistState();
    this.notifyProgress();
    this.log("warn", "تم إيقاف جميع عمليات المعالجة مؤقتاً.");
  }

  public pauseFile(fileId: string) {
    const item = this.queue.find((f) => f.id === fileId);
    if (item && item.status === "processing") {
      item.status = "paused";
      this.persistState();
      this.notifyProgress();
      this.log("warn", `تم إيقاف معالجة: ${item.subjectName} مؤقتاً.`, fileId);
    }
  }

  public resume() {
    this.isPaused = false;
    for (const item of this.queue) {
      if (item.status === "paused") {
        item.status = "pending";
      }
    }
    this.persistState();
    this.notifyProgress();
    this.log("info", "تم استئناف المعالجة المتزامنة.");
    this.startProcessing();
  }

  public resumeFile(fileId: string) {
    const item = this.queue.find((f) => f.id === fileId);
    if (item && (item.status === "paused" || item.status === "failed")) {
      item.status = "pending";
      item.errorMessage = null;
      this.persistState();
      this.notifyProgress();
      this.log("info", `تم تفعيل المنهج للاستئناف: ${item.subjectName}`, fileId);
      this.startProcessing();
    }
  }

  public retryFailed(fileId?: string) {
    if (fileId) {
      const item = this.queue.find((f) => f.id === fileId);
      if (item) {
        item.status = "pending";
        item.errorMessage = null;
        item.failedPages = 0;
        // Clean failed pages in checkpoint
        const cp = loadCheckpoint(fileId);
        if (cp) {
          for (const [pNo, pRes] of Object.entries(cp.completedPages)) {
            if (pRes.status === "failed") {
              delete cp.completedPages[Number(pNo)];
            }
          }
          initCheckpoint(item);
        }
        this.log("info", `إعادة محاولة الصفحات المعلقة لـ: ${item.subjectName}`, fileId);
      }
    } else {
      for (const item of this.queue) {
        if (item.status === "failed" || item.failedPages > 0) {
          item.status = "pending";
          item.errorMessage = null;
          item.failedPages = 0;
        }
      }
      this.log("info", "إعادة محاولة جميع المناهج والصفحات المتعثرة.");
    }
    this.persistState();
    this.notifyProgress();
    this.startProcessing();
  }

  public async startProcessing() {
    if (this.isProcessing) {
      this.checkAndFillWorkerSlots();
      return;
    }

    this.isProcessing = true;
    this.isPaused = false;
    this.log("info", "بدء تشغيل محرك المعالجة المتزامنة.");

    await this.runMultiWorkerLoop();

    this.isProcessing = false;
    this.persistState();
    this.notifyProgress();
  }

  private async runMultiWorkerLoop() {
    const maxFiles = Math.max(1, this.settings.maxConcurrentFiles || 2);

    while (!this.isPaused) {
      const pendingFiles = this.queue.filter(
        (f) => f.status === "pending"
      );

      if (pendingFiles.length === 0 && this.activeWorkers === 0) {
        break;
      }

      while (this.activeWorkers < maxFiles && !this.isPaused) {
        const nextFile = this.queue.find((f) => f.status === "pending");
        if (!nextFile) break;

        this.activeWorkers++;
        this.processFileAsync(nextFile).finally(() => {
          this.activeWorkers--;
        });
      }

      await new Promise((res) => setTimeout(res, 500));
    }
  }

  private checkAndFillWorkerSlots() {
    const maxFiles = Math.max(1, this.settings.maxConcurrentFiles || 2);
    while (this.activeWorkers < maxFiles && !this.isPaused) {
      const nextFile = this.queue.find((f) => f.status === "pending");
      if (!nextFile) break;

      this.activeWorkers++;
      this.processFileAsync(nextFile).finally(() => {
        this.activeWorkers--;
      });
    }
  }

  private async processFileAsync(file: FileQueueItem) {
    file.status = "processing";
    file.startedAt = file.startedAt || new Date().toISOString();
    file.errorMessage = null;
    this.persistState();
    this.notifyProgress();

    this.log("info", `بدء معالجة: ${file.subjectName} (${file.filename})`, file.id);

    const docHandler = new PDFDocumentHandler(file.filepath);

    try {
      // 1. Initialize Document & Total Pages
      if (!file.totalPages || file.totalPages <= 0) {
        file.totalPages = await docHandler.init();
        this.log("info", `إجمالي الصفحات المكتشفة: ${file.totalPages}`, file.id);
      } else {
        await docHandler.init();
      }

      // 2. Initialize Checkpoint
      const checkpoint = initCheckpoint(file);

      // 3. Find remaining pages to process
      const pagesToProcess: number[] = [];
      for (let p = 1; p <= file.totalPages; p++) {
        const existing = checkpoint.completedPages[p];
        if (!existing || existing.status !== "success") {
          pagesToProcess.push(p);
        }
      }

      const completedCount = Object.values(checkpoint.completedPages).filter(
        (p) => p.status === "success"
      ).length;
      const failedCount = Object.values(checkpoint.completedPages).filter(
        (p) => p.status === "failed"
      ).length;

      file.processedPages = completedCount;
      file.failedPages = failedCount;
      this.persistState();
      this.notifyProgress();

      this.log(
        "info",
        `تم استعادة ${completedCount} صفحة مكتملة. المتبقي للمعالجة: ${pagesToProcess.length} صفحة.`,
        file.id
      );

      const batchSize = Math.max(1, this.settings.batchSize || 3);
      const startTime = Date.now();
      let processedInThisRun = 0;

      // 4. Batch Page Processing
      for (let i = 0; i < pagesToProcess.length; i += batchSize) {
        const currentStatus = file.status as FileStatus;
        if (this.isPaused || currentStatus === "paused") {
          file.status = "paused";
          this.persistState();
          this.notifyProgress();
          await docHandler.destroy();
          return;
        }

        const currentBatch = pagesToProcess.slice(i, i + batchSize);
        file.currentOperation = `معالجة الصفحات [${currentBatch.join(", ")}]`;
        this.notifyProgress();

        // Process batch concurrently
        const batchPromises = currentBatch.map((pNo) =>
          this.processSinglePage(file, docHandler, pNo)
        );

        await Promise.all(batchPromises);

        // Update progress counts
        const updatedCp = loadCheckpoint(file.id);
        if (updatedCp) {
          const successCount = Object.values(updatedCp.completedPages).filter(
            (p) => p.status === "success"
          ).length;
          const fails = Object.values(updatedCp.completedPages).filter(
            (p) => p.status === "failed"
          ).length;

          file.processedPages = successCount;
          file.failedPages = fails;
          processedInThisRun += currentBatch.length;

          // Calculate speed in pages per minute
          const elapsedMinutes = (Date.now() - startTime) / 60000;
          if (elapsedMinutes > 0) {
            file.speedPagesPerMin = Number((processedInThisRun / elapsedMinutes).toFixed(1));
          }
        }

        this.persistState();
        this.notifyProgress();

        if (this.settings.delayBetweenBatchesMs > 0) {
          await new Promise((res) => setTimeout(res, this.settings.delayBetweenBatchesMs));
        }
      }

      // 5. Final Assembly & Markdown Export
      const finalCheckpoint = loadCheckpoint(file.id);
      if (finalCheckpoint) {
        const stageDir = ensureOutputDir(file.gradeLevel);
        const safeSubjectName = file.subjectName.replace(/[\\/:*?"<>|]/g, "_");
        const outputPath = path.join(stageDir, `${safeSubjectName}.md`);

        const sortedPageNumbers = Object.keys(finalCheckpoint.completedPages)
          .map(Number)
          .sort((a, b) => a - b);

        let fullMarkdown = `# منهج ${file.subjectName}\n\n`;

        for (const pNo of sortedPageNumbers) {
          const pageRes = finalCheckpoint.completedPages[pNo];
          if (pageRes && pageRes.processedMarkdown && pageRes.processedMarkdown.trim().length > 0) {
            fullMarkdown += `\n\n<!-- بداية الصفحة ${pNo} -->\n` + pageRes.processedMarkdown;
          }
        }

        fs.writeFileSync(outputPath, fullMarkdown, "utf-8");

        file.status = "completed";
        file.outputFilePath = outputPath;
        file.completedAt = new Date().toISOString();
        file.currentOperation = "اكتمل بنجاح";
        this.log("success", `اكتمل استخراج وتنظيم المنهج بالكامل: ${outputPath}`, file.id);
      }
    } catch (error: any) {
      console.error(`Error processing file ${file.filename}:`, error);
      file.status = "failed";
      file.errorMessage = error.message || "حدث خطأ غير متوقع أثناء المعالجة";
      this.log("error", `فشلت معالجة المنهج: ${file.errorMessage}`, file.id);
    } finally {
      await docHandler.destroy();
      this.persistState();
      this.notifyProgress();
    }
  }

  private async processSinglePage(
    file: FileQueueItem,
    docHandler: PDFDocumentHandler,
    pageNumber: number
  ): Promise<PageExtractionResult> {
    let attempts = 0;
    const maxRetries = Math.max(1, this.settings.maxRetries || 6);

    while (attempts < maxRetries) {
      attempts++;
      try {
        // Step 1: Extract Text & Image
        const pageContent = await docHandler.extractPage(pageNumber);

        // Step 2: EdenAI Vision OCR
        const rawVisionText = await extractWithEdenAI(
          pageContent.extractedText,
          pageContent.imageBuffer,
          {
            apiKey: this.settings.edenAiApiKey,
            maxRetries: 4,
            onNetworkWait: (att, max, delay) => {
              this.log(
                "warn",
                `انتظار استقرار الاتصال بالإنترنت للصفحة ${pageNumber} (المحاولة ${att}/${max})`,
                file.id,
                pageNumber
              );
            },
          }
        );

        // Step 3: DeepSeek RAG Structuring
        const processedMarkdown = await organizeTextWithDeepSeek(rawVisionText, {
          apiKey: this.settings.deepSeekApiKey,
          subjectName: file.subjectName,
          gradeLevel: file.gradeLevel,
          maxRetries: 4,
          onNetworkWait: (att, max, delay) => {
            this.log(
              "warn",
              `انتظار خادم DeepSeek للصفحة ${pageNumber} (المحاولة ${att}/${max})`,
              file.id,
              pageNumber
            );
          },
        });

        const pageResult: PageExtractionResult = {
          pageNumber,
          rawVisionText,
          processedMarkdown,
          status: "success",
          attempts,
          error: null,
          timestamp: new Date().toISOString(),
        };

        savePageResult(file.id, pageResult);
        this.log("success", `تمت معالجة وهيكلة الصفحة ${pageNumber} بنجاح`, file.id, pageNumber);
        return pageResult;
      } catch (error: any) {
        this.log(
          "warn",
          `تعثرت معالجة الصفحة ${pageNumber} (المحاولة ${attempts}/${maxRetries}): ${error.message}`,
          file.id,
          pageNumber
        );

        if (attempts >= maxRetries) {
          const failedResult: PageExtractionResult = {
            pageNumber,
            rawVisionText: "",
            processedMarkdown: `<!-- فشل استخراج الصفحة ${pageNumber} -->\n`,
            status: "failed",
            attempts,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
          savePageResult(file.id, failedResult);
          return failedResult;
        }

        const waitMs = Math.min(2000 * Math.pow(1.5, attempts - 1), 15000);
        await new Promise((res) => setTimeout(res, waitMs));
      }
    }

    return {
      pageNumber,
      rawVisionText: "",
      processedMarkdown: "",
      status: "failed",
      attempts,
      error: "Exceeded max retries",
      timestamp: new Date().toISOString(),
    };
  }

  public getCurriculumMarkdown(fileId: string): string | null {
    const item = this.queue.find((f) => f.id === fileId);
    if (!item) return null;

    if (item.outputFilePath && fs.existsSync(item.outputFilePath)) {
      return fs.readFileSync(item.outputFilePath, "utf-8");
    }

    const cp = loadCheckpoint(fileId);
    if (!cp) return null;

    const sortedPageNumbers = Object.keys(cp.completedPages)
      .map(Number)
      .sort((a, b) => a - b);

    let md = `# منهج ${item.subjectName}\n\n`;
    for (const pNo of sortedPageNumbers) {
      const pageRes = cp.completedPages[pNo];
      if (pageRes && pageRes.processedMarkdown) {
        md += `\n\n<!-- بداية الصفحة ${pNo} -->\n` + pageRes.processedMarkdown;
      }
    }
    return md;
  }

  private log(
    level: "info" | "warn" | "error" | "success",
    message: string,
    fileId?: string,
    pageNumber?: number
  ) {
    const logItem: ProcessingLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString("ar-EG"),
      level,
      message,
      fileId,
      pageNumber,
    };
    this.logs.unshift(logItem);
    if (this.logs.length > 600) this.logs.pop();
    if (this.onLogCallback) {
      this.onLogCallback(logItem);
    }
  }

  private notifyProgress() {
    if (this.onProgressCallback) {
      this.onProgressCallback(this.getQueue());
    }
  }
}
