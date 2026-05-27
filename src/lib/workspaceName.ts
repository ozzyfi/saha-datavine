export function workspaceName(email?: string | null): string {
  if (!email) return "Workspace";
  const prefix = (email.split("@")[0] || "user").replace(/[._-]+/g, " ").trim();
  const first = prefix.split(/\s+/)[0] || "user";
  const cap = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return `${cap}'s Workspace`;
}

export function workspaceInitial(email?: string | null): string {
  return (email?.[0] ?? "U").toUpperCase();
}
