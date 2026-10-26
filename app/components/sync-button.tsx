"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { syncNow } from "@/app/actions";

interface SyncButtonProps {
  label?: string;
  variant?: "primary" | "secondary";
}

export function SyncButton({
  label = "Sincronizar ofertas",
  variant = "primary",
}: SyncButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setPending(true);
    setMessage(null);
    setFailed(false);
    try {
      const summary = await syncNow();
      const results = summary.results;
      const fetched = results.reduce((total, result) => total + result.fetched, 0);
      const inserted = results.reduce((total, result) => total + result.inserted, 0);
      const errors = results.filter((result) => result.error);

      if (errors.length > 0 && results.length === errors.length) {
        setFailed(true);
        setMessage(errors[0].error ?? "No se pudo sincronizar.");
      } else {
        setMessage(
          `${fetched} ofertas revisadas, ${inserted} nuevas · ${summary.scored} analizadas, ${summary.excluded} descartadas por filtros${
            errors.length > 0 ? ` · ${errors.length} fuente(s) con error` : ""
          }.`,
        );
      }
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-blue-700 text-white shadow-sm hover:bg-blue-800"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`${base} ${styles}`}
      >
        {pending ? "Sincronizando..." : label}
      </button>
      {message ? (
        <p
          className={`text-xs ${failed ? "text-red-700" : "text-emerald-700"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
