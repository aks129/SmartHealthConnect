import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";
import { useMediaQuery } from "../../hooks/use-media-query";

export function ThemeToggle() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [theme, setTheme] = useState<"light" | "dark">(prefersDark ? "dark" : "light");

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      className="transition-colors hover:bg-muted"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}