"use client";

import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { useCrmCurrency } from "../../lib/use-crm-currency";

export const ReportsView = () => {
    const report = useQuery(api.private.crmReports.getSummary, {});
    const { formatMoney } = useCrmCurrency();

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-4xl">Reports</h1>
                    <p className="text-muted-foreground">CRM summary metrics and module counts.</p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {report
                        ? [
                              ["Leads", String(report.totals.leads)],
                              ["Deals", String(report.totals.deals)],
                              ["Contacts", String(report.totals.contacts)],
                              ["Accounts", String(report.totals.accounts)],
                              ["Activities", String(report.totals.activities)],
                              ["Campaigns", String(report.totals.campaigns)],
                              [
                                  "Total Deal Value",
                                  formatMoney(report.totals.totalDealValue, { maximumFractionDigits: 0 }),
                              ],
                              ["Won Deals", String(report.totals.wonDeals)],
                              ["Lost Deals", String(report.totals.lostDeals)],
                          ].map(([label, value]) => (
                              <div key={label} className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                                  <p className="text-sm text-muted-foreground">{label}</p>
                                  <p className="mt-1 text-3xl font-semibold">{value}</p>
                              </div>
                          ))
                        : null}
                </div>

                <div className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Module</TableHead>
                                <TableHead>Records</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!report ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : (
                                Object.entries(report.byModule).map(([module, count]) => (
                                    <TableRow key={module}>
                                        <TableCell className="capitalize">{module}</TableCell>
                                        <TableCell>{count}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

