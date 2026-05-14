export const todayISO = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const monthKey = (date: string | Date) => {
  const value =
    typeof date === 'string'
      ? date
      : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return value.slice(0, 7);
};

export const currentMonthKey = () => monthKey(todayISO());

export const formatKoreanDate = (date: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00`));

export const monthLabel = (key: string) => {
  const [year, month] = key.split('-');
  return `${year}년 ${Number(month)}월`;
};

export const addMonths = (month: string, delta: number) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const recentMonthKeys = (count: number, base = currentMonthKey()) => {
  const months: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    months.push(addMonths(base, -index));
  }
  return months;
};

export const dateForMonthDay = (month: string, day: number) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};
