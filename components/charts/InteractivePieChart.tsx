"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector, ResponsiveContainer, Cell } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ChartData {
    name: string
    value: number
    fill: string
    [key: string]: any
}

interface InteractivePieChartProps {
    title: string
    description?: string
    data: ChartData[]
    label: string
}

export function InteractivePieChart({ title, description, data, label }: InteractivePieChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center min-h-[250px] text-muted-foreground text-sm">
                    No data available
                </CardContent>
            </Card>
        )
    }

    // Default active item is "All" to show total first
    const [activeName, setActiveName] = React.useState("All")

    const totalValue = React.useMemo(() =>
        data.reduce((acc, curr) => acc + curr.value, 0),
        [data]
    )

    // Sync active state if data changes and current selection is invalid
    React.useEffect(() => {
        if (activeName !== "All" && !data.find(d => d.name === activeName)) {
            setActiveName("All")
        }
    }, [data, activeName])

    const activeIndex = React.useMemo(
        () => data.findIndex((item) => item.name === activeName),
        [activeName, data]
    )

    const activeItem = data[activeIndex]

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-start space-y-0 pb-2">
                <div className="grid gap-1 flex-1">
                    <CardTitle className="text-base">{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </div>
                <Select value={activeName} onValueChange={setActiveName} >
                    <SelectTrigger
                        className="ml-auto h-7 w-[160px] rounded-lg pl-2.5 text-xs"
                        aria-label="Select a segment"
                    >
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-xl max-h-[200px]">
                        <SelectItem value="All" className="rounded-lg [&_span]:flex text-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex h-3 w-3 shrink-0 rounded-full bg-gray-900 dark:bg-gray-100" />
                                <span className="truncate">All {label}</span>
                            </div>
                        </SelectItem>
                        {data.map((item) => (
                            <SelectItem
                                key={item.name}
                                value={item.name}
                                className="rounded-lg [&_span]:flex text-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="flex h-3 w-3 shrink-0 rounded-full"
                                        style={{ backgroundColor: item.fill }}
                                    />
                                    <span className="truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="flex flex-1 justify-center pb-0">
                <div className="mx-auto aspect-square w-full max-w-[250px] h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                outerRadius={80}
                                strokeWidth={5}
                                // @ts-ignore
                                activeIndex={activeIndex}
                                activeShape={({
                                    cx,
                                    cy,
                                    innerRadius,
                                    outerRadius = 0,
                                    startAngle,
                                    endAngle,
                                    fill,
                                }: PieSectorDataItem) => (
                                    <g>
                                        <Sector
                                            cx={cx}
                                            cy={cy}
                                            innerRadius={innerRadius}
                                            outerRadius={outerRadius + 10}
                                            startAngle={startAngle}
                                            endAngle={endAngle}
                                            fill={fill}
                                        />
                                        <Sector
                                            cx={cx}
                                            cy={cy}
                                            startAngle={startAngle}
                                            endAngle={endAngle}
                                            innerRadius={outerRadius + 12}
                                            outerRadius={outerRadius + 25}
                                            fill={fill}
                                        />
                                    </g>
                                )}
                            >
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-3xl font-bold"
                                                    >
                                                        {(activeName === "All" ? totalValue : activeItem?.value)?.toLocaleString()}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy || 0) + 24}
                                                        className="fill-muted-foreground text-xs"
                                                    >
                                                        {label}
                                                    </tspan>
                                                </text>
                                            )
                                        }
                                    }}
                                />
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={activeIndex === index ? "none" : "#fff"} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
