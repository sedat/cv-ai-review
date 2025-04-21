declare module "pdfjs-dist/build/pdf" {
    export const version: string;
    export const GlobalWorkerOptions: {
        workerSrc: string;
    };
    export function getDocument(source: string | Uint8Array): {
        promise: Promise<{
            numPages: number;
            getPage: (pageNumber: number) => Promise<{
                getViewport: (options: { scale: number }) => {
                    width: number;
                    height: number;
                };
                getTextContent: () => Promise<{
                    items: any[];
                }>;
                render: (options: any) => {
                    promise: Promise<void>;
                    cancel: () => void;
                };
            }>;
        }>;
    };
}

declare module "pdfjs-dist/webpack" {
    export const version: string;
    export const GlobalWorkerOptions: {
        workerSrc: string;
    };
    export function getDocument(source: string | Uint8Array): {
        promise: Promise<{
            numPages: number;
            getPage: (pageNumber: number) => Promise<{
                getViewport: (options: { scale: number }) => {
                    width: number;
                    height: number;
                };
                getTextContent: () => Promise<{
                    items: any[];
                }>;
                render: (options: any) => {
                    promise: Promise<void>;
                    cancel: () => void;
                };
            }>;
        }>;
    };
}

declare module "pdfjs-dist/es5/build/pdf" {
    export const version: string;
    export const GlobalWorkerOptions: {
        workerSrc: string | any;
    };
    export function getDocument(source: string | Uint8Array): {
        promise: Promise<{
            numPages: number;
            getPage: (pageNumber: number) => Promise<{
                getViewport: (options: { scale: number }) => {
                    width: number;
                    height: number;
                };
                getTextContent: () => Promise<{
                    items: any[];
                }>;
                render: (options: any) => {
                    promise: Promise<void>;
                    cancel: () => void;
                };
            }>;
        }>;
    };
}

declare module "pdfjs-dist/es5/build/pdf.worker.entry" {
    const workerSrc: any;
    export default workerSrc;
}
