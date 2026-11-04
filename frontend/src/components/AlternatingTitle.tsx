"use client";

import { useEffect, useRef, useState } from "react";

const TEXTS = [
  { part1: "Aprenda inglês de um jeito", part2: "doce e eficiente" },
  { part1: "Learn English in a", part2: "sweet and efficient way" },
] as const;

const PAUSE_MS = 15000;
const CHAR_DELAY_MS = 100;

function getFullText(i: number) {
  const t = TEXTS[i];
  return `${t.part1} ${t.part2}`;
}

export function AlternatingTitle() {
  const [index, setIndex] = useState(0);
  const fullText = getFullText(index);
  const [length, setLength] = useState(fullText.length);
  const [phase, setPhase] = useState<"typing" | "paused">("paused");
  const splitAt = TEXTS[index].part1.length + 1;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (phase === "paused") {
      timeoutRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % TEXTS.length);
        setLength(0);
        setPhase("typing");
      }, PAUSE_MS);
      return () => clearTimeout(timeoutRef.current);
    }

    if (phase === "typing" && length < fullText.length) {
      timeoutRef.current = setTimeout(() => {
        setLength((l) => l + 1);
      }, CHAR_DELAY_MS);
      return () => clearTimeout(timeoutRef.current);
    }

    if (phase === "typing" && length === fullText.length) {
      const id = setTimeout(() => setPhase("paused"), 0);
      return () => clearTimeout(id);
    }
  }, [phase, length, fullText.length, index]);

  const displayed = fullText.slice(0, length);
  const part1 = length <= splitAt ? displayed : fullText.slice(0, splitAt);
  const part2 = length <= splitAt ? "" : displayed.slice(splitAt);

  return (
    <h1
      className="mb-5 text-[2.4rem] font-semibold leading-[1.08] text-ink sm:text-5xl lg:min-h-[2.2em] lg:text-6xl"
      aria-live="polite"
    >
      {part1}
      {part2 && <span className="bg-gradient-to-r from-grape to-candy bg-clip-text text-transparent">{part2}</span>}
      {phase === "typing" && length < fullText.length && (
        <span
          className="inline-block w-0.5 h-[0.9em] bg-accent ml-0.5 animate-pulse align-middle"
          aria-hidden
        />
      )}
    </h1>
  );
}
