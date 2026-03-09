"use client";

import { useState } from "react";

const PUBLIC_API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/public/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Subscription failed");
      }

      setStatus("success");
      setMessage("You're subscribed! Check your inbox.");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 rounded-full bg-green-50 px-6 py-3 text-sm font-medium text-green-700">
        ✓ {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        placeholder="you@company.com"
        className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-72"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-slate-900 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {status === "loading" ? "Subscribing…" : "Subscribe"}
      </button>
      {status === "error" && (
        <p className="mt-1 text-xs text-red-500 sm:mt-0 sm:self-center">{message}</p>
      )}
    </form>
  );
}
