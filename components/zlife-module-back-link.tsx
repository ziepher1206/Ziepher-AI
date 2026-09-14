"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

type ZLifeModuleBackLinkProps = {
  className?: string;
  children: ReactNode;
};

export function ZLifeModuleBackLink({ className, children }: ZLifeModuleBackLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const referrer = document.referrer;
    if (referrer) {
      try {
        const previousUrl = new URL(referrer);
        if (previousUrl.origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {
        // Fall through to the stable modules anchor.
      }
    }

    router.push("/#modules");
  }

  return (
    <a href="/#modules" className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
