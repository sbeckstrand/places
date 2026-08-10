"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  // next-themes doesn't know the real theme until after mount (it has to
  // avoid a server/client mismatch), so hold off rendering the active state
  // until then rather than briefly showing every option as unselected.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Standard next-themes hydration-safety pattern: runs once client-side
    // after the real theme is known, not the cascading-render case the rule
    // guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Theme</span>
      <div className="flex gap-2">
        {OPTIONS.map((option) => {
          const active = mounted && theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={
                active
                  ? "rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500">
        &quot;System&quot; follows your device&apos;s light/dark setting.
      </p>
    </div>
  );
}
