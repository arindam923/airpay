export default function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  width = "w-[170px]",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  width?: string;
}) {
  return (
    <div className="relative">
      <svg
        width="12"
        height="12"
        viewBox="0 0 14 14"
        fill="none"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-d-muted"
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`h-8 ${width} rounded-lg border border-d-edge bg-d-raised pl-8 pr-3 text-[12.5px] text-d-ink placeholder:text-d-muted/70 focus:border-d-accent focus:outline-none`}
      />
    </div>
  );
}
