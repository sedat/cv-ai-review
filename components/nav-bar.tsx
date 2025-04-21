"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavBar() {
    const pathname = usePathname();

    const links = [
        { href: "/", label: "CV Optimizer" },
        { href: "/pdf-editor", label: "PDF Editor" },
    ];

    return (
        <div className="bg-white dark:bg-slate-950 border-b">
            <div className="container flex items-center h-16 px-4">
                <nav className="flex items-center space-x-4 lg:space-x-6">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === link.href
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}
