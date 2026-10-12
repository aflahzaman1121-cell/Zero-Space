"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
export function TrendChart({ points }: { points: { label: string; pct: number; title: string }[] }) {
  return (
    <div style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#E6E8FF" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7092" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B7092" }} />
          <Tooltip formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ""} />
          <Line type="monotone" dataKey="pct" stroke="#2B3CFF" strokeWidth={3} dot={{ r: 4, fill: "#2B3CFF" }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
