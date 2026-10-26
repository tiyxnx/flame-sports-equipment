export const ADMIN_EMAILS = [
  "asmi.malushte@flame.edu.in",
  "tiyana.shah@flame.edu.in",
] as const;

export const AUTHORIZED_EMAIL_SENDERS = [
  "asmi.malushte@flame.edu.in",
  "tiyana.shah@flame.edu.in",
] as const;

export function isAuthorizedEmailSender(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return AUTHORIZED_EMAIL_SENDERS.some((sender) => sender.toLowerCase() === clean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === clean);
}
