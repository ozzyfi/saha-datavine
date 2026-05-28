import toolaLogo from "@/assets/toola-logo.png";
import { cn } from "@/lib/utils";

export type LogoSize = "sidebar" | "login" | "sm";

// Centralized sizing for the ToolA wordmark. Tweak here to update everywhere.
// Uses responsive heights so the logo stays proportional across breakpoints.
const SIZE_CLASSES: Record<LogoSize, string> = {
  // Sidebar: scales gently with viewport so it stays balanced on narrow + wide screens
  sidebar: "h-10 sm:h-11 lg:h-12",
  // Login card: bold, prominent wordmark
  login: "w-[190px]",
  // Small inline usage (footers, compact headers)
  sm: "h-6",
};

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export function Logo({ size = "sidebar", className }: LogoProps) {
  return (
    <img
      src={toolaLogo}
      alt="ToolA"
      className={cn("w-auto block select-none", SIZE_CLASSES[size], className)}
      draggable={false}
    />
  );
}

export default Logo;
