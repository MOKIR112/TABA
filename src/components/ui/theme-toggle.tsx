import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ui/theme-provider";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative overflow-hidden rounded-2xl transition-all duration-300 ease-in-out hover:bg-primary/10 hover:shadow-glow-soft focus-ring"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 ease-in-out dark:-rotate-90 dark:scale-0 text-primary" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 ease-in-out dark:rotate-0 dark:scale-100 text-primary" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-eco border-primary/20 shadow-floating min-w-[160px]"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`transition-all duration-200 ease-in-out hover:bg-primary/10 rounded-xl cursor-pointer ${theme === "light" ? "bg-primary/20 text-primary font-medium" : ""}`}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>{t("common.lightMode") || "Light"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`transition-all duration-200 ease-in-out hover:bg-primary/10 rounded-xl cursor-pointer ${theme === "dark" ? "bg-primary/20 text-primary font-medium" : ""}`}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>{t("common.darkMode") || "Dark"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`transition-all duration-200 ease-in-out hover:bg-primary/10 rounded-xl cursor-pointer ${theme === "system" ? "bg-primary/20 text-primary font-medium" : ""}`}
        >
          <div className="mr-2 h-4 w-4 rounded-full bg-gradient-to-r from-primary/60 to-primary/40" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
