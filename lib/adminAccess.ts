const ADMIN_EMAILS = [
  "ztoa777111@gmail.com",
  "y.nishith@optern.in",
  "support@optern.in",
] as const;

export function canAccessAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(
    email.trim().toLowerCase() as (typeof ADMIN_EMAILS)[number],
  );
}
