export default function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-d-edge bg-d-raised p-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
            value === o ? "bg-d-ink text-d-bg" : "text-d-muted hover:text-d-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
