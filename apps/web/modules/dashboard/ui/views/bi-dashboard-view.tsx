"use client";

import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
    LayoutDashboardIcon,
    RefreshCwIcon,
    TrendingUpIcon,
    UsersIcon,
    BriefcaseIcon,
    ActivityIcon,
    DollarSignIcon,
    Percent,
} from "lucide-react";
import { useId, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Button } from "@workspace/ui/components/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { formatCrmMoney, normalizeCrmCurrencyCode } from "@/modules/crm/lib/crm-currency";
import { LEAD_SOURCE_OPTIONS } from "@/modules/crm/ui/leads-ui-constants";

/** Power BI–style accent palette */
const PBI_COLORS = [
    "#118DFF",
    "#12239E",
    "#E66C37",
    "#6B007B",
    "#00B294",
    "#744EC2",
    "#D9B300",
    "#E044A7",
];

const axisStyle = { fontSize: 11, fill: "#605e5c" };
const gridStyle = { stroke: "#edebe9", strokeDasharray: "3 3" };

function formatSourceLabel(key: string) {
    if (key === "Unknown") return "Unknown";
    const o = LEAD_SOURCE_OPTIONS.find((x) => x.value === key);
    return o?.label ?? key;
}

function VisualChrome({
    title,
    subtitle,
    className,
    children,
}: {
    title: string;
    subtitle?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                "flex flex-col overflow-hidden rounded-sm border border-[#e1dfdd] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2 border-b border-[#edebe9] bg-[#faf9f8] px-3 py-2">
                <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#605e5c]">
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className="text-muted-foreground mt-0.5 text-[10px]">{subtitle}</p>
                    ) : null}
                </div>
            </div>
            <div className="min-h-[220px] flex-1 p-3">{children}</div>
        </div>
    );
}

function KpiCard({
    label,
    value,
    hint,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    hint?: string;
    icon: ComponentType<{ className?: string }>;
    accent: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-sm border border-[#e1dfdd] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: accent }}
            />
            <div className="pl-2">
                <div className="flex items-center gap-2">
                    <Icon className="size-4 text-[#605e5c]" />
                    <p className="text-[11px] font-medium text-[#605e5c]">{label}</p>
                </div>
                <p className="mt-3 text-3xl font-light tabular-nums tracking-tight text-[#323130]">
                    {value}
                </p>
                {hint ? <p className="mt-1 text-[11px] text-[#605e5c]">{hint}</p> : null}
            </div>
        </div>
    );
}

type MonthsOption = 3 | 6 | 12;

export const BiDashboardView = () => {
    const gradientId = useId().replace(/:/g, "");
    const [monthsBack, setMonthsBack] = useState<MonthsOption>(6);
    const [leadSourceFilter, setLeadSourceFilter] = useState<string>("all");
    const [dealStageFilter, setDealStageFilter] = useState<string>("all");
    const [salesReportGrain, setSalesReportGrain] = useState<"day" | "month" | "year">("month");
    const [refreshNonce, setRefreshNonce] = useState(0);
    const crmSettings = useQuery(api.private.crmSettings.getOne, {});
    const data = useQuery(api.private.crmReports.getDashboardAnalytics, {
        monthsBack,
        refreshNonce,
    });
    const salesReport = useQuery(api.private.sales.getTimeSeriesReport, { grain: salesReportGrain });

    const formatCurrency = useMemo(() => {
        const currency = normalizeCrmCurrencyCode(crmSettings?.defaultCurrency);
        return (n: number) => formatCrmMoney(n, currency, { maximumFractionDigits: 0 });
    }, [crmSettings?.defaultCurrency]);

    const pieSourceData = useMemo(() => {
        if (!data?.leadsBySource?.length) return [];
        const rows = data.leadsBySource.filter((r) =>
            leadSourceFilter === "all" ? true : r.name === leadSourceFilter,
        );
        if (rows.length <= 7) {
            return rows.map((r) => ({
                name: formatSourceLabel(r.name),
                value: r.value,
            }));
        }
        const top = rows.slice(0, 6);
        const rest = rows.slice(6).reduce((s, r) => s + r.value, 0);
        return [
            ...top.map((r) => ({ name: formatSourceLabel(r.name), value: r.value })),
            { name: "Other", value: rest },
        ];
    }, [data?.leadsBySource, leadSourceFilter]);

    const filteredDealsByStage = useMemo(() => {
        if (!data?.dealsByStage) return [];
        return data.dealsByStage.filter((row) =>
            dealStageFilter === "all" ? true : row.name === dealStageFilter,
        );
    }, [data?.dealsByStage, dealStageFilter]);

    const combinedTrend = useMemo(() => {
        if (!data?.leadsOverTime || !data?.dealsOverTime) return [];
        return data.leadsOverTime.map((row, i) => ({
            period: row.period,
            leads: row.leads,
            deals: data.dealsOverTime[i]?.deals ?? 0,
        }));
    }, [data?.leadsOverTime, data?.dealsOverTime]);

    const salesChartRows = useMemo(() => {
        if (!salesReport?.series) return [];
        return salesReport.series.map((s) => ({ label: s.label, total: s.total }));
    }, [salesReport?.series]);

    const winRate =
        data && data.totals.deals > 0
            ? Math.round((data.totals.wonDeals / data.totals.deals) * 100)
            : 0;

    const leadToDeal =
        data && data.totals.leads > 0
            ? Math.round((data.totals.deals / data.totals.leads) * 100)
            : 0;

    const refreshedLabel = data
        ? format(new Date(data.generatedAt), "MMM d, yyyy · HH:mm")
        : "—";

    return (
        <div className="min-h-screen bg-[#f3f2f1]">
            <header className="sticky top-0 z-10 border-b border-[#e1dfdd] bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:px-6">
                <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 items-center justify-center rounded-sm bg-[#118DFF]/12">
                            <LayoutDashboardIcon className="size-5 text-[#118DFF]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-[#323130] md:text-xl">
                                Executive report
                            </h1>
                            <p className="text-muted-foreground text-xs md:text-sm">
                                CRM & pipeline analytics
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-sm border border-[#edebe9] bg-[#faf9f8] px-2 py-1">
                            <span className="text-muted-foreground hidden text-[11px] sm:inline">
                                Time range
                            </span>
                            <Select
                                value={String(monthsBack)}
                                onValueChange={(v) => setMonthsBack(Number(v) as MonthsOption)}
                            >
                                <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent text-xs shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">Last 3 months</SelectItem>
                                    <SelectItem value="6">Last 6 months</SelectItem>
                                    <SelectItem value="12">Last 12 months</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 border-[#edebe9] text-xs"
                            onClick={() => setRefreshNonce((n) => n + 1)}
                        >
                            <RefreshCwIcon className="size-3.5" />
                            Refresh
                        </Button>
                        <div className="flex items-center gap-2 rounded-sm border border-[#edebe9] bg-[#faf9f8] px-2 py-1">
                            <span className="text-muted-foreground hidden text-[11px] sm:inline">
                                Lead source
                            </span>
                            <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter}>
                                <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent text-xs shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All sources</SelectItem>
                                    {(data?.leadsBySource ?? []).map((row) => (
                                        <SelectItem key={row.name} value={row.name}>
                                            {formatSourceLabel(row.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 rounded-sm border border-[#edebe9] bg-[#faf9f8] px-2 py-1">
                            <span className="text-muted-foreground hidden text-[11px] sm:inline">
                                Deal stage
                            </span>
                            <Select value={dealStageFilter} onValueChange={setDealStageFilter}>
                                <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent text-xs shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All stages</SelectItem>
                                    {(data?.dealsByStage ?? []).map((row) => (
                                        <SelectItem key={row.name} value={row.name}>
                                            {row.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <p className="text-muted-foreground mx-auto mt-2 max-w-[1600px] px-0 text-[10px] md:text-xs">
                    Last computed {refreshedLabel}
                </p>
            </header>

            <main className="mx-auto max-w-[1600px] space-y-4 p-4 pb-12 md:p-6">
                {!data ? (
                    <div className="rounded-sm border border-[#e1dfdd] bg-white p-12 text-center text-sm text-[#605e5c]">
                        Loading workspace…
                    </div>
                ) : (
                    <>
                        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <KpiCard
                                label="Total leads"
                                value={String(data.totals.leads)}
                                hint="All time in organization"
                                icon={UsersIcon}
                                accent="#118DFF"
                            />
                            <KpiCard
                                label="Open pipeline"
                                value={String(data.totals.openDeals)}
                                hint={`${formatCurrency(data.totals.forecastPipelineValue ?? 0)} forecast value`}
                                icon={BriefcaseIcon}
                                accent="#12239E"
                            />
                            <KpiCard
                                label="Win rate"
                                value={`${winRate}%`}
                                hint={`${data.totals.wonDeals} won · ${data.totals.lostDeals} lost`}
                                icon={Percent}
                                accent="#00B294"
                            />
                            <KpiCard
                                label="Open activities"
                                value={String(data.totals.activitiesOpen)}
                                hint={`${data.totals.activities} activities total`}
                                icon={ActivityIcon}
                                accent="#E66C37"
                            />
                        </section>

                        <section className="grid gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <VisualChrome
                                    title="Leads & deals trend"
                                    subtitle="Monthly new records in selected range"
                                >
                                    <div className="h-[280px] w-full min-h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart
                                                data={combinedTrend}
                                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                            >
                                                <CartesianGrid {...gridStyle} />
                                                <XAxis
                                                    dataKey="period"
                                                    tick={axisStyle}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    tick={axisStyle}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    allowDecimals={false}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    tick={axisStyle}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    allowDecimals={false}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{
                                                        borderRadius: 4,
                                                        border: "1px solid #edebe9",
                                                        fontSize: 12,
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar
                                                    yAxisId="left"
                                                    dataKey="leads"
                                                    name="Leads"
                                                    fill="#118DFF"
                                                    radius={[2, 2, 0, 0]}
                                                    maxBarSize={40}
                                                />
                                                <Line
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey="deals"
                                                    name="Deals"
                                                    stroke="#12239E"
                                                    strokeWidth={2}
                                                    dot={{ r: 3 }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </VisualChrome>
                            </div>
                            <div className="lg:col-span-4">
                                <VisualChrome
                                    title="Leads by source"
                                    subtitle="Share of known acquisition channels"
                                >
                                    <div className="h-[280px] w-full min-h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieSourceData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="58%"
                                                    outerRadius="88%"
                                                    paddingAngle={1}
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {pieSourceData.map((_, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={PBI_COLORS[i % PBI_COLORS.length]!}
                                                        />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    contentStyle={{
                                                        borderRadius: 4,
                                                        border: "1px solid #edebe9",
                                                        fontSize: 12,
                                                    }}
                                                />
                                                <Legend
                                                    layout="horizontal"
                                                    verticalAlign="bottom"
                                                    wrapperStyle={{ fontSize: 10 }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </VisualChrome>
                            </div>
                        </section>

                        <section className="grid gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-12">
                                <VisualChrome
                                    title="Sales report"
                                    subtitle={
                                        salesReport
                                            ? `${salesReport.entryCount} logged ${
                                                  salesReport.entryCount === 1 ? "entry" : "entries"
                                              } in range · ${formatCurrency(salesReport.totalInRange)} total`
                                            : "Recorded sales from CRM → Sales"
                                    }
                                >
                                    <div className="mb-2 flex justify-end">
                                        <div className="flex items-center gap-2 rounded-sm border border-[#edebe9] bg-[#faf9f8] px-2 py-1">
                                            <span className="text-muted-foreground hidden text-[11px] sm:inline">
                                                View by
                                            </span>
                                            <Select
                                                value={salesReportGrain}
                                                onValueChange={(v) =>
                                                    setSalesReportGrain(v as "day" | "month" | "year")
                                                }
                                            >
                                                <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent text-xs shadow-none">
                                                    <SelectValue placeholder="Period" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="day">Day</SelectItem>
                                                    <SelectItem value="month">Month</SelectItem>
                                                    <SelectItem value="year">Year</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="h-[260px] w-full min-h-[260px]">
                                        {!salesReport ? (
                                            <div className="flex h-full items-center justify-center text-sm text-[#605e5c]">
                                                Loading sales…
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={salesChartRows}
                                                    margin={{ top: 8, right: 8, left: 0, bottom: 28 }}
                                                >
                                                    <CartesianGrid {...gridStyle} />
                                                    <XAxis
                                                        dataKey="label"
                                                        tick={axisStyle}
                                                        interval={salesReportGrain === "day" ? 2 : 0}
                                                        angle={salesReportGrain === "month" ? -16 : 0}
                                                        textAnchor={
                                                            salesReportGrain === "month" ? "end" : "middle"
                                                        }
                                                        height={salesReportGrain === "month" ? 40 : 28}
                                                    />
                                                    <YAxis tick={axisStyle} />
                                                    <RechartsTooltip
                                                        formatter={(value: number) => [
                                                            formatCurrency(value),
                                                            "Revenue",
                                                        ]}
                                                        contentStyle={{
                                                            borderRadius: 4,
                                                            border: "1px solid #edebe9",
                                                            fontSize: 12,
                                                        }}
                                                    />
                                                    <Bar
                                                        dataKey="total"
                                                        name="Revenue"
                                                        fill="#00B294"
                                                        radius={[2, 2, 0, 0]}
                                                        maxBarSize={48}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </VisualChrome>
                            </div>
                        </section>

                        <section className="grid gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-5">
                                <VisualChrome
                                    title="Lead funnel (status)"
                                    subtitle="Normalized pipeline stages"
                                >
                                    <div className="h-[260px] w-full min-h-[260px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={data.leadsByStatus}
                                                layout="vertical"
                                                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                                            >
                                                <CartesianGrid {...gridStyle} horizontal={false} />
                                                <XAxis type="number" tick={axisStyle} allowDecimals={false} />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={88}
                                                    tick={axisStyle}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{
                                                        borderRadius: 4,
                                                        border: "1px solid #edebe9",
                                                        fontSize: 12,
                                                    }}
                                                />
                                                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                                                    {data.leadsByStatus.map((_, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={PBI_COLORS[i % PBI_COLORS.length]!}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </VisualChrome>
                            </div>
                            <div className="lg:col-span-7">
                                <VisualChrome
                                    title="Deals by stage"
                                    subtitle="Count and aggregate opportunity value"
                                >
                                    <div className="h-[260px] w-full min-h-[260px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={filteredDealsByStage}
                                                margin={{ top: 8, right: 8, left: 0, bottom: 32 }}
                                            >
                                                <CartesianGrid {...gridStyle} />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={axisStyle}
                                                    interval={0}
                                                    angle={-20}
                                                    textAnchor="end"
                                                    height={48}
                                                />
                                                <YAxis tick={axisStyle} allowDecimals={false} />
                                                <RechartsTooltip
                                                    formatter={(value, _name, item) => {
                                                        const payload = item?.payload as {
                                                            count?: number;
                                                            amount?: number;
                                                        };
                                                        if (payload?.amount !== undefined) {
                                                            return [
                                                                `${value} deals · ${formatCurrency(payload.amount)}`,
                                                                "Stage",
                                                            ];
                                                        }
                                                        return [value, "Deals"];
                                                    }}
                                                    contentStyle={{
                                                        borderRadius: 4,
                                                        border: "1px solid #edebe9",
                                                        fontSize: 12,
                                                    }}
                                                />
                                                <Bar
                                                    dataKey="count"
                                                    name="Deals"
                                                    fill="#118DFF"
                                                    radius={[2, 2, 0, 0]}
                                                    maxBarSize={40}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </VisualChrome>
                            </div>
                        </section>

                        <section className="grid gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-4">
                                <VisualChrome title="Auxiliary KPIs" subtitle="Coverage ratios">
                                    <div className="grid gap-3">
                                        <div className="flex items-center justify-between rounded-sm border border-[#edebe9] bg-[#faf9f8] px-3 py-2">
                                            <div className="flex items-center gap-2 text-[#605e5c]">
                                                <TrendingUpIcon className="size-4" />
                                                <span className="text-xs">Lead → deal conversion</span>
                                            </div>
                                            <span className="text-sm font-semibold tabular-nums text-[#323130]">
                                                {leadToDeal}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-sm border border-[#edebe9] bg-[#faf9f8] px-3 py-2">
                                            <div className="flex items-center gap-2 text-[#605e5c]">
                                                <DollarSignIcon className="size-4" />
                                                <span className="text-xs">Forecast value</span>
                                            </div>
                                            <span className="text-sm font-semibold tabular-nums text-[#323130]">
                                                {formatCurrency(data.totals.forecastPipelineValue ?? 0)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-sm border border-[#edebe9] bg-[#faf9f8] px-3 py-2">
                                            <div className="flex items-center gap-2 text-[#605e5c]">
                                                <UsersIcon className="size-4" />
                                                <span className="text-xs">Accounts · contacts</span>
                                            </div>
                                            <span className="text-xs font-medium tabular-nums text-[#323130]">
                                                {data.totals.accounts} · {data.totals.contacts}
                                            </span>
                                        </div>
                                    </div>
                                </VisualChrome>
                            </div>
                            <div className="lg:col-span-8">
                                <VisualChrome
                                    title="Lead velocity (area)"
                                    subtitle="Cumulative new leads per month in range"
                                >
                                    <div className="h-[220px] w-full min-h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart
                                                data={data.leadsOverTime.map((row, i, arr) => ({
                                                    ...row,
                                                    cumulative: arr
                                                        .slice(0, i + 1)
                                                        .reduce((s, r) => s + r.leads, 0),
                                                }))}
                                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient
                                                        id={gradientId}
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="1"
                                                    >
                                                        <stop offset="0%" stopColor="#118DFF" stopOpacity={0.35} />
                                                        <stop offset="100%" stopColor="#118DFF" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid {...gridStyle} />
                                                <XAxis
                                                    dataKey="period"
                                                    tick={axisStyle}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis tick={axisStyle} allowDecimals={false} />
                                                <RechartsTooltip
                                                    contentStyle={{
                                                        borderRadius: 4,
                                                        border: "1px solid #edebe9",
                                                        fontSize: 12,
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="cumulative"
                                                    name="Cumulative leads"
                                                    stroke="#118DFF"
                                                    fill={`url(#${gradientId})`}
                                                    strokeWidth={2}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </VisualChrome>
                            </div>
                        </section>

                        {data.moduleTop.length > 0 ? (
                            <VisualChrome
                                title="Custom modules activity"
                                subtitle="Top modules by record count"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-[#edebe9] text-[#605e5c]">
                                                <th className="py-2 pr-4 font-semibold">Module</th>
                                                <th className="py-2 font-semibold">Records</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.moduleTop.map((row) => (
                                                <tr key={row.name} className="border-b border-[#f3f2f1]">
                                                    <td className="py-2 pr-4 text-[#323130]">{row.name}</td>
                                                    <td className="py-2 tabular-nums text-[#323130]">{row.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </VisualChrome>
                        ) : null}
                    </>
                )}
            </main>
        </div>
    );
};
