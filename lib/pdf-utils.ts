// lib/pdf-utils.ts

/**
 * Extract text content from a PDF file
 * Uses pdfjs-dist dynamically to prevent SSR / DOMMatrix issues
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    
    // Set up the worker on client side
    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      text += pageText + "\n";
    }

    return text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from PDF: ${errMsg}`);
  }
}