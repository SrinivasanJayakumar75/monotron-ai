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

export const ReportsView = () => {
    const report = useQuery(api.private.crmReports.getSummary, {});

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
                              ["Leads", report.totals.leads],
                              ["Deals", report.totals.deals],
                              ["Contacts", report.totals.contacts],
                              ["Accounts", report.totals.accounts],
                              ["Activities", report.totals.activities],
                              ["Campaigns", report.totals.campaigns],
                              ["Total Deal Value", report.totals.totalDealValue],
                              ["Won Deals", report.totals.wonDeals],
                              ["Lost Deals", report.totals.lostDeals],
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

