"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents({ content }: { content: string }) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Parse headings from HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const elements = doc.querySelectorAll("h1, h2, h3");
    const items: TocItem[] = [];
    elements.forEach((el, i) => {
      const text = el.textContent?.trim() || "";
      if (!text) return;
      const id = `heading-${i}-${text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 60)}`;
      items.push({
        id,
        text,
        level: parseInt(el.tagName.charAt(1)),
      });
    });
    setHeadings(items);
  }, [content]);

  // Inject IDs into actual DOM headings and observe for scroll
  useEffect(() => {
    if (headings.length === 0) return;

    // Inject IDs into the rendered article headings
    const article = document.querySelector("article");
    if (!article) return;

    const elements = article.querySelectorAll("h1, h2, h3");
    let idx = 0;
    elements.forEach((el) => {
      const text = el.textContent?.trim() || "";
      if (!text) return;
      if (idx < headings.length) {
        el.id = headings[idx].id;
        idx++;
      }
    });

    // Intersection observer for active state
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav className="hidden xl:block">
      <div className="sticky top-24">
        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
          Table of Contents
        </h4>
        <ul className="space-y-1 border-l-2 border-slate-100">
          {headings.map((h) => (
            <li
              key={h.id}
              style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
            >
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`block py-1 text-sm leading-snug transition-colors ${
                  activeId === h.id
                    ? "font-semibold text-indigo-600 border-l-2 border-indigo-600 -ml-[2px] pl-[2px]"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
