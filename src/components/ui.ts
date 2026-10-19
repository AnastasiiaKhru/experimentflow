export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const card =
  'rounded-xl border border-[#e6e8ec] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]';

export const btn =
  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export const btnPrimary = `${btn} bg-[#0f6cbd] text-white hover:bg-[#115ea3]`;
export const btnSecondary = `${btn} border border-[#d2d0ce] bg-white text-[#201f1e] hover:bg-[#faf9f8]`;
export const btnQuiet = `${btn} px-2.5 text-[#323130] hover:bg-[#f3f2f1]`;
export const btnDanger = `${btn} px-2.5 text-[#a4262c] hover:bg-[#fdf6f6]`;
export const field =
  'w-full rounded-md border border-[#d2d0ce] bg-white px-3 py-2 text-sm text-[#201f1e] outline-none placeholder:text-[#a19f9d] focus:border-[#0f6cbd]';
export const labelText =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]';
