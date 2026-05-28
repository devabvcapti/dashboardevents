'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { RegistrationRhythmDay } from '@/lib/data'

const AXIS_STYLE = {
  fontSize: 11,
  fontFamily: 'var(--font-ibm-mono)',
  fill: 'oklch(0.52 0.04 254)',
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid oklch(0.89 0.010 240)',
  borderRadius: '6px',
  color: '#112468',
  fontSize: '12px',
  fontFamily: 'var(--font-ibm-mono)',
  boxShadow: '0 4px 16px rgba(17, 36, 104, 0.08)',
}

const GRID_COLOR = 'oklch(0.89 0.010 240)'

function formatDateLabel(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export function RitmoCharts({ byDay }: { byDay: RegistrationRhythmDay[] }) {
  const { resolvedTheme } = useTheme()
  const navyColor = resolvedTheme === 'dark' ? '#6b9be8' : '#112468'

  const chartData = byDay.map(d => ({
    ...d,
    dateLabel: formatDateLabel(d.date),
  }))

  // Ticks: show at most 20 evenly spaced date labels to avoid crowding
  const tickStep = Math.max(1, Math.ceil(chartData.length / 20))
  const tickDates = chartData
    .filter((_, i) => i % tickStep === 0 || i === chartData.length - 1)
    .map(d => d.dateLabel)

  return (
    <div className="space-y-4">
      {/* Inscrições diárias + acumulado */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-4">
          Inscrições Diárias e Acumulado
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeOpacity={0.6} />
            <XAxis
              dataKey="dateLabel"
              tick={{ ...AXIS_STYLE, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              ticks={tickDates}
            />
            <YAxis
              yAxisId="left"
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ ...AXIS_STYLE, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'oklch(0.21 0.11 265 / 0.04)' }}
              formatter={(value, name) => [
                value,
                name === 'count' ? 'Inscrições no dia' : 'Acumulado',
              ]}
              labelFormatter={label => `Data: ${label}`}
            />
            <Legend
              formatter={value => value === 'count' ? 'Inscrições no dia' : 'Acumulado'}
              wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-ibm-mono)' }}
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="count"
              fill="#00a99d"
              fillOpacity={0.8}
              radius={[2, 2, 0, 0]}
              maxBarSize={32}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="cumulative"
              stroke={navyColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: navyColor, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
