"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Building2Icon, CalendarIcon, MailIcon, PhoneIcon, SettingsIcon, UsersIcon, ActivityIcon, ClipboardListIcon, FileTextIcon, ReceiptIcon, LayersIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { useCrmCurrency } from "../../lib/use-crm-currency";

type CrmModule = {
    title: string;
    href: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
};

const modules: CrmModule[] = [
    {
        title: "Leads",
        href: "/crm/leads",
        description: "Capture, qualify, and move leads through stages.",
        icon: UsersIcon,
    },
    {
        title: "Accounts",
        href: "/crm/accounts",
        description: "Companies and organizations you sell to.",
        icon: Building2Icon,
    },
    {
        title: "Contacts",
        href: "/crm/contacts",
        description: "People at companies (supports account links).",
        icon: UsersIcon,
    },
    {
        title: "Deals",
        href: "/crm/deals",
        description: "Opportunities and sales tracking.",
        icon: ReceiptIcon,
    },
    {
        title: "Activities",
        href: "/crm/activities",
        description: "Tasks, calls, emails, and meetings.",
        icon: ClipboardListIcon,
    },
    {
        title: "Tasks",
        href: "/crm/tasks",
        description: "Follow-ups and to-dos.",
        icon: ClipboardListIcon,
    },
    {
        title: "Events",
        href: "/crm/events",
        description: "Meetings and scheduled events.",
        icon: CalendarIcon,
    },
    {
        title: "Calls",
        href: "/crm/calls",
        description: "Track outbound/inbound calls.",
        icon: PhoneIcon,
    },
    {
        title: "Emails",
        href: "/crm/emails",
        description: "Email activities and follow-ups.",
        icon: MailIcon,
    },
    {
        title: "Notes",
        href: "/crm/notes",
        description: "Keep notes linked to CRM records.",
        icon: FileTextIcon,
    },
    {
        title: "Campaigns",
        href: "/crm/campaigns",
        description: "Marketing campaigns and status tracking.",
        icon: ActivityIcon,
    },
    { title: "Products", href: "/crm/products", description: "Products and pricing catalog.", icon: ReceiptIcon },
    { title: "Quotes", href: "/crm/quotes", description: "Sales quotes and revisions.", icon: ReceiptIcon },
    { title: "Orders", href: "/crm/orders", description: "Order fulfillment lifecycle.", icon: ReceiptIcon },
    { title: "Invoices", href: "/crm/invoices", description: "Billing and receivables.", icon: ReceiptIcon },
    { title: "Payments", href: "/crm/payments", description: "Payment tracking and settlement.", icon: ReceiptIcon },
    { title: "Contracts", href: "/crm/contracts", description: "Contract terms and renewals.", icon: ReceiptIcon },
    { title: "Documents", href: "/crm/documents", description: "Shared CRM documents.", icon: FileTextIcon },
    { title: "Approval Process", href: "/crm/approvals", description: "Record approval workflows.", icon: ShieldCheckIcon },
    { title: "Reports", href: "/crm/reports", description: "Detailed CRM reporting.", icon: LayersIcon },
    { title: "Settings", href: "/crm/settings", description: "CRM preferences and defaults.", icon: SettingsIcon },
];

export const CrmHomeView = () => {
    const report = useQuery(api.private.crmReports.getSummary, {});
    const { formatMoney, settingsLoading } = useCrmCurrency();
    const spotlight = modules.slice(0, 8);
    const allModules = modules;

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-6 md:p-8">
            <div className="mx-auto w-full max-w-[1400px]">
                <div className="space-y-2 rounded-xl border bg-white/80 p-5 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="size-5 text-indigo-600" />
                        <h1 className="text-2xl md:text-3xl">CRM Dashboard</h1>
                    </div>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Sales, service, and operations overview with quick access to all CRM modules.
                    </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Card className="border-indigo-100 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-indigo-100">Total Leads</CardDescription>
                            <CardTitle className="text-2xl">{report?.totals.leads ?? "—"}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-blue-100 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-blue-100">Total Deals</CardDescription>
                            <CardTitle className="text-2xl">{report?.totals.deals ?? "—"}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-emerald-100 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-emerald-100">Pipeline Value</CardDescription>
                            <CardTitle className="text-2xl">
                                {report === undefined || settingsLoading
                                    ? "—"
                                    : formatMoney(report.totals.totalDealValue, { maximumFractionDigits: 0 })}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-cyan-100 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-cyan-100">Won Deals</CardDescription>
                            <CardTitle className="text-2xl">{report?.totals.wonDeals ?? "—"}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="border-violet-100 bg-gradient-to-r from-violet-500 to-violet-600 text-white">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-violet-100">Open Activities</CardDescription>
                            <CardTitle className="text-2xl">{report?.totals.activities ?? "—"}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <Card className="xl:col-span-4 border-indigo-100 bg-white/90">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Jump directly into daily CRM work.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {spotlight.map((m) => {
                                const Icon = m.icon;
                                return (
                                    <Link
                                        key={m.href}
                                        href={m.href}
                                        className="flex items-center gap-3 rounded-md border border-indigo-100 bg-indigo-50/50 p-3 hover:bg-indigo-100/60 transition-colors"
                                    >
                                        <Icon className="size-4 text-indigo-600" />
                                        <div>
                                            <p className="text-sm font-medium">{m.title}</p>
                                            <p className="text-xs text-muted-foreground">{m.description}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card className="xl:col-span-8 border-blue-100 bg-white/90">
                        <CardHeader>
                            <CardTitle>Modules</CardTitle>
                            <CardDescription>All CRM areas in one place.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {allModules.map((m) => {
                                    const Icon = m.icon;
                                    return (
                                        <Link
                                            key={m.href}
                                            href={m.href}
                                            className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/70 p-3 hover:bg-blue-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="size-4 text-blue-600" />
                                                <div>
                                                    <p className="text-sm font-medium">{m.title}</p>
                                                    <p className="text-xs text-muted-foreground">{m.description}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-muted-foreground">Open</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

