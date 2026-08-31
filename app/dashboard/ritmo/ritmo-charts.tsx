'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { RegistrationRhythmDay, MarketingCommunication } from '@/lib/data'

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

function truncateLabel(text: string, max = 18) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

interface Props {
  byDay: RegistrationRhythmDay[]
  communications?: MarketingCommunication[]
}

export function RitmoCharts({ byDay, communications = [] }: Props) {
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

  const chartDateLabels = new Set(chartData.map(d => d.dateLabel))
  const commMarkers = communications
    .map(c => ({ ...c, dateLabel: formatDateLabel(c.sentAt) }))
    .filter(c => chartDateLabels.has(c.dateLabel))

  return (
    <div className="space-y-4">
      {/* Inscrições diárias + acumulado */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <p className="text-[10px] font-mono tracking-[0.20em] text-muted-foreground uppercase mb-4">
          Inscrições Diárias e Acumulado
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 28, right: 16, left: -20, bottom: 0 }}>
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
            {commMarkers.map(c => (
              <ReferenceLine
                key={c.id}
                x={c.dateLabel}
                yAxisId="left"
                stroke="#f97316"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: truncateLabel(c.channel),
                  position: 'top',
                  fill: '#f97316',
                  fontSize: 9,
                  fontFamily: 'var(--font-ibm-mono)',
                  offset: 8,
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        {commMarkers.length > 0 && (
          <p className="text-[10px] font-mono text-muted-foreground/50 mt-3">
            <span className="inline-block w-3 border-t border-dashed border-[#f97316] align-middle mr-1.5" />
            linhas tracejadas marcam comunicados de marketing enviados — use para correlacionar visualmente com picos de inscrição
          </p>
        )}
      </div>
    </div>
  )
}
