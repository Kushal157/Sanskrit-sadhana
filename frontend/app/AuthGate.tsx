"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) return;

        const isPublicRoute = PUBLIC_ROUTES.has(pathname);

        if (!user && !isPublicRoute) {
            router.replace("/login");
            return;
        }

        if (user && isPublicRoute) {
            router.replace("/");
        }
    }, [isLoading, pathname, router, user]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-white/60">
                Loading Sanskrit Sadhana...
            </div>
        );
    }

    const isPublicRoute = PUBLIC_ROUTES.has(pathname);
    if (!user && !isPublicRoute) {
        return null;
    }

    if (user && isPublicRoute) {
        return null;
    }

    return <>{children}</>;
}
