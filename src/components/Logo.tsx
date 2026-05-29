import toolaLogo from "@/assets/toola-logo.png";
import { cn } from "@/lib/utils";

export type LogoSize = "sidebar" | "login" | "sm";

// Centralized sizing for the ToolA wordmark. Tweak here to update everywhere.
// Uses responsive heights so the logo stays proportional across breakpoints.
const SIZE_CLASSES: Record<LogoSize, string> = {
  // Sidebar: compact wordmark matching typical sidebar proportions
  sidebar: "h-12 sm:h-13",
  // Login card: proportional to the card width (max-w-sm = 384px)
  login: "w-[130px]",
  // Small inline usage (mobile header, footers)
  sm: "h-7",
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
