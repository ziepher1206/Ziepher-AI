"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

type ZLifeModuleBackLinkProps = {
  className?: string;
  children: ReactNode;
};

export function ZLifeModuleBackLink({ className, children }: ZLifeModuleBackLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const referrer = document.referrer;
    if (referrer) {
      try {
        const previousUrl = new URL(referrer);
        if (previousUrl.origin === window.location.origin) {
          event.preventDefault();
          router.back();
          return;
        }
      } catch {
        // Fall through to the stable modules anchor.
      }
    }
  }

  return (
    <Link href="/#modules" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
