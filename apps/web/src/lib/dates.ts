const dayMonth = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' });

export const formatDay = (iso: string): string => dayMonth.format(new Date(iso));
