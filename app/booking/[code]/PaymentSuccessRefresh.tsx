"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentSuccessRefresh() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;

    const timer = setTimeout(() => {
      router.refresh();
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return null;
}
