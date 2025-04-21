declare module "pdfjs-dist/build/pdf.worker.entry";
declare module "pdfjs-dist/build/pdf.worker.mjs";

declare module "pdfjs-dist" {
    const GlobalWorkerOptions: {
        workerSrc: string;
    };

    const version: string;

    interface PDFPageViewport {
        width: number;
        height: number;
        scale: number;
    }

    interface PDFPageTextContent {
        items: Array<{
            str: string;
            transform: number[];
            width?: number;
            height?: number;
        }>;
    }

    interface PDFPageProxy {
        getViewport(options: { scale: number }): PDFPageViewport;
        getTextContent(): Promise<PDFPageTextContent>;
        render(options: {
            canvasContext: CanvasRenderingContext2D;
            viewport: PDFPageViewport;
        }): {
            promise: Promise<void>;
        };
    }

    interface PDFDocumentProxy {
        numPages: number;
        getPage(pageNumber: number): Promise<PDFPageProxy>;
    }

    interface PDFDocumentLoadingTask {
        promise: Promise<PDFDocumentProxy>;
    }

    function getDocument(source: string | Uint8Array): PDFDocumentLoadingTask;
}
