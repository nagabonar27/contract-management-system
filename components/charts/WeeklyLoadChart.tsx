"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WeeklyLoadChartProps {
    data: {
        name: string
        total: number
        labelWeek?: string
        labelMonth?: string
    }[]
}

export function WeeklyLoadChart({ data }: WeeklyLoadChartProps) {
    const CustomTick = (props: any) => {
        const { x, y, payload } = props
        const index = payload.index
        const item = data[index]

        if (!item) return null

        // Show month if it's the first item or different from the previous item
        const showMonth = index === 0 || (index > 0 && data[index - 1].labelMonth !== item.labelMonth)

        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12}>
                    {item.labelWeek}
                </text>
                {showMonth && (
                    <text x={0} y={0} dy={30} textAnchor="middle" fill="#999" fontSize={12} className="capitalize">
                        {item.labelMonth}
                    </text>
                )}
            </g>
        )
    }

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Weekly Load</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data} margin={{ bottom: 20 }}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tick={CustomTick}
                            interval={0}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0) {
                                    const item = payload[0].payload
                                    return `${item.labelMonth} Week ${item.labelWeek}`
                                }
                                return label
                            }}
                        />
                        <Bar
                            dataKey="total"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary"
                        />
                    </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                    Number of active contracts per week
                </p>
            </CardContent>
        </Card>
    )
}
