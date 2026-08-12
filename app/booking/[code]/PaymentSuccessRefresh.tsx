"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentSuccessRefresh() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;

    router.refresh();

    const interval = setInterval(() => {
      router.refresh();
    }, 2000);

    const stop = setTimeout(() => {
      clearInterval(interval);
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [router, searchParams]);

  return null;
}