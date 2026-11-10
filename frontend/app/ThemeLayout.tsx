"use client";

import React from "react";
import ThemeProvider, { useTheme } from "../context/ThemeContext";
import { Navbar } from "./components/Navbar";
import { usePathname } from "next/navigation";

export default function ThemeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeContent>{children}</ThemeContent>
    </ThemeProvider>
  );
}

function ThemeContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <div className={`${theme} min-h-screen text-foreground antialiased flex flex-col transition-colors duration-300`}>
      {!isAuthPage && <Navbar />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
