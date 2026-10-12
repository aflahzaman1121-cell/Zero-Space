export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold tracking-tight" style={{ fontSize: size }}>
      <span aria-hidden className="inline-block rounded-full border-blue" style={{ width: size + 4, height: size + 4, borderWidth: Math.max(3, size / 5), borderStyle: "solid" }} />
      zero space
    </span>
  );
}
