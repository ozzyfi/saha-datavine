import toolaLogo from "@/assets/toola-logo.png";
import { cn } from "@/lib/utils";

export type LogoSize = "sidebar" | "login" | "sm";

// Centralized sizing for the ToolA wordmark. Tweak here to update everywhere.
// Uses responsive heights so the logo stays proportional across breakpoints.
const SIZE_CLASSES: Record<LogoSize, string> = {
  // Sidebar: large, balanced with the workspace card below
  sidebar: "h-14 sm:h-16 lg:h-[68px]",
  // Login card: bold, prominent wordmark
  login: "w-[190px]",
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
