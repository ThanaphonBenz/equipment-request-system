export function StockBar({
  available,
  total,
  className = "w-40",
}: {
  available: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? Math.round((available / total) * 100) : 0;
  const color = available === 0 ? "bg-rose-500" : percent <= 30 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={className}>
      <p className="mb-1 text-sm tabular-nums">
        <span className={`font-semibold ${available === 0 ? "text-rose-600" : "text-slate-900"}`}>{available}</span>
        <span className="text-slate-400"> / {total}</span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
