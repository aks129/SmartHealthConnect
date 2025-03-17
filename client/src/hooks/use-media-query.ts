import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Current browser support
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", listener);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(listener);
    }

    // Initial check
    setMatches(mediaQuery.matches);

    return () => {
      // Cleanup
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}