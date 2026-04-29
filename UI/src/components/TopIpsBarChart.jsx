import {
  ResponsiveContainer, BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--popover-foreground))",
  },
};

export default function TopIpsBarChart({ data, onSelect, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="ip"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          width={120}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip {...tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Bar
          dataKey="count"
          radius={[0, 6, 6, 0]}
          onClick={(d) => onSelect && onSelect(d?.ip)}
          cursor={onSelect ? "pointer" : "default"}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
