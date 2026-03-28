"use client";

import { api } from "@workspace/backend/_generated/api";
import { useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import { DEFAULT_CRM_CURRENCY, formatCrmMoney, normalizeCrmCurrencyCode } from "./crm-currency";

export function useCrmCurrency() {
    const settings = useQuery(api.private.crmSettings.getOne, {});

    const currency = useMemo(() => {
        if (settings === undefined) return DEFAULT_CRM_CURRENCY;
        return normalizeCrmCurrencyCode(settings.defaultCurrency);
    }, [settings?.defaultCurrency, settings === undefined]);

    const formatMoney = useCallback(
        (amount: number | undefined, options?: Intl.NumberFormatOptions) =>
            formatCrmMoney(amount, currency, options),
        [currency],
    );

    return {
        currency,
        formatMoney,
        settingsLoading: settings === undefined,
    };
}
