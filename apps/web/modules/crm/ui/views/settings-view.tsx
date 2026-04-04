"use client";

import { api } from "@workspace/backend/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import {
    CRM_CURRENCY_OPTIONS,
    DEFAULT_CRM_CURRENCY,
    normalizeCrmCurrencyCode,
} from "../../lib/crm-currency";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

export const SettingsView = () => {
    const settings = useQuery(api.private.crmSettings.getOne, {});
    const upsertSettings = useMutation(api.private.crmSettings.upsert);

    const [defaultCurrency, setDefaultCurrency] = useState("USD");
    const [taxRate, setTaxRate] = useState("0");
    const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState("1");
    const [autoNumbering, setAutoNumbering] = useState(true);
    const [saving, setSaving] = useState(false);

    const currencySelectOptions = useMemo(() => {
        const v = normalizeCrmCurrencyCode(defaultCurrency);
        if (v && !CRM_CURRENCY_OPTIONS.some((o) => o.value === v)) {
            return [{ value: v, label: `${v} (saved)` }, ...CRM_CURRENCY_OPTIONS];
        }
        return CRM_CURRENCY_OPTIONS;
    }, [defaultCurrency]);

    useEffect(() => {
        if (!settings) return;
        setDefaultCurrency(normalizeCrmCurrencyCode(settings.defaultCurrency));
        setTaxRate(String(settings.taxRate));
        setFiscalYearStartMonth(String(settings.fiscalYearStartMonth));
        setAutoNumbering(settings.autoNumbering);
    }, [settings]);

    const onSave = async () => {
        setSaving(true);
        try {
            await upsertSettings({
                defaultCurrency: defaultCurrency.trim().toUpperCase() || DEFAULT_CRM_CURRENCY,
                taxRate: Number(taxRate) || 0,
                fiscalYearStartMonth: Number(fiscalYearStartMonth) || 1,
                autoNumbering,
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

                <div className="mt-8 space-y-8">
                    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">Currency</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Used for deal amounts, lead expected value, pipeline totals, and charts on the executive
                            dashboard.
                        </p>
                        <div className="mt-4 space-y-2">
                            <Label htmlFor="crm-currency">Organization currency</Label>
                            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                                <SelectTrigger id="crm-currency" className="max-w-md">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencySelectOptions.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-6 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">Other CRM defaults</h2>
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
                    <Button className={CRM_PRIMARY_BTN} onClick={onSave} disabled={saving}>
                        {saving ? "Saving…" : "Save all settings"}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                        Saves currency, tax, fiscal year, and auto numbering together.
                    </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

