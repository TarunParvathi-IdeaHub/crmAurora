"use client";

import { BookOpenCheck } from "lucide-react";
import type { ReactNode } from "react";

type ModuleMainContentProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export default function ModuleMainContent({children }: ModuleMainContentProps) {
  const hasChildren = Boolean(children);

  return (
    <main className="flex-1 overflow-auto px-6 md:px-8 pt-6 md:pt-8 pb-4">
      <>{children}</>
    </main>
  );
}
