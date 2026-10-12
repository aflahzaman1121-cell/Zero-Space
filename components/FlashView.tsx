"use client";
import { useEffect } from "react";
export function FlashView({ kind, msg }: { kind: "ok" | "error"; msg: string }) {
  useEffect(() => { document.cookie = "zs_flash=; path=/; max-age=0"; }, []);
  return <div role={kind === "error" ? "alert" : "status"} className={`no-print mb-4 rounded-xl px-4 py-3 text-sm font-medium ${kind === "error" ? "bg-[#FFE3D6] text-[#B8420F]" : "bg-[#DDF5E6] text-[#17693A]"}`}>{msg}</div>;
}
