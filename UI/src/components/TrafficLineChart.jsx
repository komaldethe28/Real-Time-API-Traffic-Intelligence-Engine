import {
  ResponsiveContainer,
  LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--popover-foreground))",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
};

export default function TrafficLineChart({ data, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, stroke: "hsl(var(--background))", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
