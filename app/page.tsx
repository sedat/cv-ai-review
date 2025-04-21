import { CvOptimizer } from "@/components/cv-optimizer";
import Link from "next/link";

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-10 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                        CV Optimizer
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-4">
                        Upload your CV and a job description to receive
                        AI-powered suggestions to improve your chances of
                        landing that interview.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link
                            href="/pdf-editor"
                            className="text-primary hover:underline"
                        >
                            Try the PDF Editor
                        </Link>
                    </div>
                </header>
                <CvOptimizer />
            </div>
        </main>
    );
}
