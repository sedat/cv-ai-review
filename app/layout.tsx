import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
    title: "CV AI Review",
    description: "AI-powered CV optimization and PDF editing",
    generator: "v0.dev",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                >
                    <NavBar />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
