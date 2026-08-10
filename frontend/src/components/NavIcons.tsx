// Small stroke-style icons for the sidebar nav groups and permission
// overview page -- kept minimal (no icon library dependency) since these
// are the only icons the app currently needs.
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconHome({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 4.5c1.5.4 2.5 1.7 2.5 3.3s-1 2.9-2.5 3.3" />
      <path d="M17 14.2c2 .5 3.5 2.2 3.5 4.3" />
    </svg>
  );
}

export function IconBox({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3.5 7.5 12 3l8.5 4.5-8.5 4.5-8.5-4.5Z" />
      <path d="M3.5 7.5v9L12 21l8.5-4.5v-9" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function IconWrench({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5l-6 6 2.4 2.4 6-6a4 4 0 0 0 5-5.4l-2.8 2.8-2.4-2.4Z" />
    </svg>
  );
}

export function IconBuilding({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M4 21h16" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 12h.01M15 12h.01M9 8.5h.01M15 8.5h.01" />
    </svg>
  );
}

export function IconGear({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconKey({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8" />
      <path d="m16 7 3 3" />
      <path d="m13 10 2 2" />
    </svg>
  );
}

// Action icons for toolbar buttons (export/print/filter). Same stroke
// style as the nav set above -- still no icon library.
export function IconSheet({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="m9 13 4 5m0-5-4 5" />
    </svg>
  );
}

export function IconFilePdf({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M8 17v-4h1.5a1.5 1.5 0 0 1 0 3H8m5 1v-4h1.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5H13Z" />
    </svg>
  );
}

export function IconPrinter({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 9V3h10v6" />
      <path d="M5 9h14a2 2 0 0 1 2 2v6h-4v4H7v-4H3v-6a2 2 0 0 1 2-2Z" />
      <path d="M7 17h10" />
    </svg>
  );
}

export function IconTag({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}
