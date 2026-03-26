"use client";

import { api } from "@workspace/backend/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

export const SettingsView = () => {
    const settings = useQuery(api.private.crmSettings.getOne, {});
    const upsertSettings = useMutation(api.private.crmSettings.upsert);

    const [defaultCurrency, setDefaultCurrency] = useState("USD");
    const [taxRate, setTaxRate] = useState("0");
    const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState("1");
    const [autoNumbering, setAutoNumbering] = useState(true);
    const [pipelineStagesJson, setPipelineStagesJson] = useState("[]");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!settings) return;
        setDefaultCurrency(settings.defaultCurrency);
        setTaxRate(String(settings.taxRate));
        setFiscalYearStartMonth(String(settings.fiscalYearStartMonth));
        setAutoNumbering(settings.autoNumbering);
        setPipelineStagesJson(JSON.stringify(settings.pipelineStages ?? [], null, 2));
    }, [settings]);

    const onSave = async () => {
        setSaving(true);
        try {
            const parsedStages = JSON.parse(pipelineStagesJson) as Array<{
                key: string;
                label: string;
                order: number;
                probability?: number;
            }>;
            await upsertSettings({
                defaultCurrency: defaultCurrency.trim() || "USD",
                taxRate: Number(taxRate) || 0,
                fiscalYearStartMonth: Number(fiscalYearStartMonth) || 1,
                autoNumbering,
                pipelineStages: parsedStages,
            });
            toast.success("CRM settings saved");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to save settings";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-md">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-4xl">Settings</h1>
                    <p className="text-muted-foreground">Configure CRM defaults.</p>
                </div>

                <div className="mt-8 space-y-6 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="space-y-1">
                        <Label>Default currency</Label>
                        <Input value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Tax rate %</Label>
                        <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Fiscal year start month (1-12)</Label>
                        <Input
                            value={fiscalYearStartMonth}
                            onChange={(e) => setFiscalYearStartMonth(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <p className="font-medium">Auto numbering</p>
                            <p className="text-sm text-muted-foreground">
                                Automatically generate document numbers for sales docs.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={autoNumbering}
                            onChange={(e) => setAutoNumbering(e.target.checked)}
                            className="h-4 w-4"
                        />
                    </div>
                    <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={onSave} disabled={saving}>
                        Save settings
                    </Button>
                    <div className="space-y-1">
                        <Label>Pipeline stage configuration (JSON)</Label>
                        <Textarea
                            rows={10}
                            value={pipelineStagesJson}
                            onChange={(e) => setPipelineStagesJson(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

