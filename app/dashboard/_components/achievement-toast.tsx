"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { ACHIEVEMENT_ICONS } from "@/lib/achievements/icons";

export interface ToastAchievement {
  chave: string;
  titulo: string;
  icone: string;
}

export function AchievementToast({
  achievements,
  onDone,
}: {
  achievements: ToastAchievement[];
  onDone: () => void;
}) {
  const [indice, setIndice] = useState(0);

  // Reset carousel when achievements list changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndice(0);
  }, [achievements]);

  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = window.setTimeout(() => {
      if (indice + 1 < achievements.length) setIndice((i) => i + 1);
      else onDone();
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [achievements, indice, onDone]);

  if (achievements.length === 0) return null;
  const atual = achievements[indice];
  const Icone = ACHIEVEMENT_ICONS[atual.icone] ?? Lock;

  return (
    <div
      role="status"
      className="achievement-toast fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 shadow-[var(--shadow)]"
    >
      <div
        className="postmark stamp-pop"
        data-filled
        data-tone="stamp"
        style={{ "--size": "2.5rem" } as React.CSSProperties}
      >
        <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div>
        <p className="text-[0.65rem] uppercase tracking-wide text-ink-soft">Selo desbloqueado</p>
        <p className="font-medium">{atual.titulo}</p>
      </div>
    </div>
  );
}
