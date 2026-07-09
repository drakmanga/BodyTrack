import { Line, LineChart, ResponsiveContainer } from 'recharts';

export default function Sparkline({ points }) {
  if (!points || points.length < 2) return null;

  const data = points.map((value, i) => ({ i, value }));

  return (
    <div className="h-8 -mx-1 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 4, left: 4, bottom: 2 }}>
          <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
