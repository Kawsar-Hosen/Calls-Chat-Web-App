function parseServerDate(value: string): Date {
  const date = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? new Date(value) : new Date(`${value}Z`);
  return Number.isNaN(date.valueOf()) ? new Date(NaN) : date;
}

export function time(value: string): string {
  const date = parseServerDate(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatConversationDate(value: string): string {
  const date = parseServerDate(value);
  if (Number.isNaN(date.valueOf())) return '';
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
