export default function Avatar({
  name,
  size = 28,
  solid = false,
}: {
  name: string;
  size?: number;
  solid?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${
        solid ? "bg-violet text-cream" : "bg-violet/20 text-violet"
      }`}
    >
      {initials}
    </span>
  );
}
