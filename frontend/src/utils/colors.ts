/**
 * Accessible, WCAG 2.2 AA compliant color palettes for timetable courses.
 * Shared across WeeklyTimetable, exports, previews, and favourites.
 */

export interface CourseColorPalette {
  id: string;
  name: string;
  // Light mode classes
  bgLight: string;
  borderLight: string;
  textLight: string;
  badgeLight: string;
  // Dark mode classes
  bgDark: string;
  borderDark: string;
  textDark: string;
  badgeDark: string;
  // Raw hex codes for PDF / canvas exports
  hexBg: string;
  hexBorder: string;
  hexText: string;
}

export const COURSE_PALETTES: CourseColorPalette[] = [
  {
    id: "indigo",
    name: "Indigo",
    bgLight: "bg-indigo-50",
    borderLight: "border-indigo-300",
    textLight: "text-indigo-900",
    badgeLight: "bg-indigo-100 text-indigo-700",
    bgDark: "bg-indigo-950/80",
    borderDark: "border-indigo-500/60",
    textDark: "text-indigo-200",
    badgeDark: "bg-indigo-900/60 text-indigo-300",
    hexBg: "#e0e7ff",
    hexBorder: "#6366f1",
    hexText: "#312e81"
  },
  {
    id: "emerald",
    name: "Emerald",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-300",
    textLight: "text-emerald-900",
    badgeLight: "bg-emerald-100 text-emerald-700",
    bgDark: "bg-emerald-950/80",
    borderDark: "border-emerald-500/60",
    textDark: "text-emerald-200",
    badgeDark: "bg-emerald-900/60 text-emerald-300",
    hexBg: "#d1fae5",
    hexBorder: "#10b981",
    hexText: "#064e3b"
  },
  {
    id: "amber",
    name: "Amber",
    bgLight: "bg-amber-50",
    borderLight: "border-amber-300",
    textLight: "text-amber-950",
    badgeLight: "bg-amber-100 text-amber-800",
    bgDark: "bg-amber-950/80",
    borderDark: "border-amber-500/60",
    textDark: "text-amber-200",
    badgeDark: "bg-amber-900/60 text-amber-300",
    hexBg: "#fef3c7",
    hexBorder: "#f59e0b",
    hexText: "#78350f"
  },
  {
    id: "rose",
    name: "Rose",
    bgLight: "bg-rose-50",
    borderLight: "border-rose-300",
    textLight: "text-rose-900",
    badgeLight: "bg-rose-100 text-rose-700",
    bgDark: "bg-rose-950/80",
    borderDark: "border-rose-500/60",
    textDark: "text-rose-200",
    badgeDark: "bg-rose-900/60 text-rose-300",
    hexBg: "#ffe4e6",
    hexBorder: "#f43f5e",
    hexText: "#881337"
  },
  {
    id: "cyan",
    name: "Cyan",
    bgLight: "bg-cyan-50",
    borderLight: "border-cyan-300",
    textLight: "text-cyan-900",
    badgeLight: "bg-cyan-100 text-cyan-700",
    bgDark: "bg-cyan-950/80",
    borderDark: "border-cyan-500/60",
    textDark: "text-cyan-200",
    badgeDark: "bg-cyan-900/60 text-cyan-300",
    hexBg: "#cffafe",
    hexBorder: "#06b6d4",
    hexText: "#164e63"
  },
  {
    id: "purple",
    name: "Purple",
    bgLight: "bg-purple-50",
    borderLight: "border-purple-300",
    textLight: "text-purple-900",
    badgeLight: "bg-purple-100 text-purple-700",
    bgDark: "bg-purple-950/80",
    borderDark: "border-purple-500/60",
    textDark: "text-purple-200",
    badgeDark: "bg-purple-900/60 text-purple-300",
    hexBg: "#f3e8ff",
    hexBorder: "#a855f7",
    hexText: "#581c87"
  },
  {
    id: "teal",
    name: "Teal",
    bgLight: "bg-teal-50",
    borderLight: "border-teal-300",
    textLight: "text-teal-900",
    badgeLight: "bg-teal-100 text-teal-700",
    bgDark: "bg-teal-950/80",
    borderDark: "border-teal-500/60",
    textDark: "text-teal-200",
    badgeDark: "bg-teal-900/60 text-teal-300",
    hexBg: "#ccfbf1",
    hexBorder: "#14b8a6",
    hexText: "#134e4a"
  },
  {
    id: "orange",
    name: "Orange",
    bgLight: "bg-orange-50",
    borderLight: "border-orange-300",
    textLight: "text-orange-950",
    badgeLight: "bg-orange-100 text-orange-800",
    bgDark: "bg-orange-950/80",
    borderDark: "border-orange-500/60",
    textDark: "text-orange-200",
    badgeDark: "bg-orange-900/60 text-orange-300",
    hexBg: "#ffedd5",
    hexBorder: "#f97316",
    hexText: "#7c2d12"
  },
  {
    id: "blue",
    name: "Blue",
    bgLight: "bg-blue-50",
    borderLight: "border-blue-300",
    textLight: "text-blue-900",
    badgeLight: "bg-blue-100 text-blue-700",
    bgDark: "bg-blue-950/80",
    borderDark: "border-blue-500/60",
    textDark: "text-blue-200",
    badgeDark: "bg-blue-900/60 text-blue-300",
    hexBg: "#dbeafe",
    hexBorder: "#3b82f6",
    hexText: "#1e3a8a"
  },
  {
    id: "fuchsia",
    name: "Fuchsia",
    bgLight: "bg-fuchsia-50",
    borderLight: "border-fuchsia-300",
    textLight: "text-fuchsia-950",
    badgeLight: "bg-fuchsia-100 text-fuchsia-800",
    bgDark: "bg-fuchsia-950/80",
    borderDark: "border-fuchsia-500/60",
    textDark: "text-fuchsia-200",
    badgeDark: "bg-fuchsia-900/60 text-fuchsia-300",
    hexBg: "#fae8ff",
    hexBorder: "#d946ef",
    hexText: "#701a75"
  }
];

export function getCoursePalette(courseCode: string): CourseColorPalette {
  if (!courseCode) return COURSE_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_PALETTES.length;
  return COURSE_PALETTES[index];
}
