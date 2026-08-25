import fs from "fs";
import path from "path";
import {
  JobCheckpoint,
  PageExtractionResult,
  FileQueueItem,
  ProcessingSettings,
  QueueStateData,
} from "./types";

const CHECKPOINT_DIR = path.join(process.cwd(), "checkpoints");
const QUEUE_STATE_PATH = path.join(CHECKPOINT_DIR, "queue_state.json");

function ensureCheckpointDir() {
  if (!fs.existsSync(CHECKPOINT_DIR)) {
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }
}

export function getCheckpointPath(fileId: string): string {
  ensureCheckpointDir();
  return path.join(CHECKPOINT_DIR, `${fileId}.json`);
}

export function loadCheckpoint(fileId: string): JobCheckpoint | null {
  try {
    const filePath = getCheckpointPath(fileId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as JobCheckpoint;
  } catch (error) {
    console.error(`Failed to load checkpoint for ${fileId}:`, error);
    return null;
  }
}

export function initCheckpoint(file: FileQueueItem): JobCheckpoint {
  const existing = loadCheckpoint(file.id);
  if (existing) {
    existing.filename = file.filename;
    existing.subjectName = file.subjectName;
    existing.gradeLevel = file.gradeLevel;
    if (file.totalPages > 0) existing.totalPages = file.totalPages;
    saveCheckpoint(existing);
    return existing;
  }

  const checkpoint: JobCheckpoint = {
    fileId: file.id,
    filename: file.filename,
    gradeLevel: file.gradeLevel,
    subjectName: file.subjectName,
    totalPages: file.totalPages,
    completedPages: {},
    lastUpdated: new Date().toISOString(),
  };

  saveCheckpoint(checkpoint);
  return checkpoint;
}

export function saveCheckpoint(checkpoint: JobCheckpoint): void {
  try {
    ensureCheckpointDir();
    checkpoint.lastUpdated = new Date().toISOString();
    const filePath = getCheckpointPath(checkpoint.fileId);
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(checkpoint, null, 2), "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    console.error(`Failed to save checkpoint for ${checkpoint.fileId}:`, error);
  }
}

export function savePageResult(
  fileId: string,
  pageResult: PageExtractionResult
): JobCheckpoint | null {
  const checkpoint = loadCheckpoint(fileId);
  if (!checkpoint) return null;

  checkpoint.completedPages[pageResult.pageNumber] = pageResult;
  saveCheckpoint(checkpoint);
  return checkpoint;
}

export function deleteCheckpoint(fileId: string): void {
  try {
    const filePath = getCheckpointPath(fileId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete checkpoint for ${fileId}:`, error);
  }
}

export function saveQueueState(queue: FileQueueItem[], settings: ProcessingSettings): void {
  try {
    ensureCheckpointDir();
    const data: QueueStateData = {
      queue,
      settings,
      lastUpdated: new Date().toISOString(),
    };
    const tempPath = `${QUEUE_STATE_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, QUEUE_STATE_PATH);
  } catch (error) {
    console.error("Failed to save queue state:", error);
  }
}

export function loadQueueState(): QueueStateData | null {
  try {
    ensureCheckpointDir();
    if (!fs.existsSync(QUEUE_STATE_PATH)) {
      return null;
    }
    const data = fs.readFileSync(QUEUE_STATE_PATH, "utf-8");
    return JSON.parse(data) as QueueStateData;
  } catch (error) {
    console.error("Failed to load queue state:", error);
    return null;
  }
}
