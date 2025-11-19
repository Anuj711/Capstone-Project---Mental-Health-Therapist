export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function getUserFirstName(displayName?: string | null, email?: string | null): string {
  if (displayName) {
    return displayName.split(' ')[0];
  }
  if (email) {
    return email.split('@')[0];
  }
  return 'there';
}
