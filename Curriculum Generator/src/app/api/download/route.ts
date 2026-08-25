import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { QueueProcessor } from "@/lib/queue_processor";

export const dynamic = "force-dynamic";

declare global {
  var globalQueueProcessor: QueueProcessor | undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");
  const fileId = searchParams.get("fileId");

  try {
    let targetPath = filePath;

    if (!targetPath && fileId && globalThis.globalQueueProcessor) {
      const item = globalThis.globalQueueProcessor.getQueue().find((f) => f.id === fileId);
      if (item && item.outputFilePath) {
        targetPath = item.outputFilePath;
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      // If file not on disk but processor has markdown in checkpoints
      if (fileId && globalThis.globalQueueProcessor) {
        const md = globalThis.globalQueueProcessor.getCurriculumMarkdown(fileId);
        if (md) {
          return new Response(md, {
            headers: {
              "Content-Type": "text/markdown; charset=utf-8",
              "Content-Disposition": `attachment; filename="curriculum_${fileId}.md"`,
            },
          });
        }
      }
      return NextResponse.json({ error: "الملف المطلوب غير موجود" }, { status: 404 });
    }

    const fileContent = fs.readFileSync(targetPath, "utf-8");
    const filename = path.basename(targetPath);

    return new Response(fileContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "فشل تحميل ملف المنهج" },
      { status: 500 }
    );
  }
}
