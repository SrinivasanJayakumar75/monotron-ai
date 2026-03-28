/** Common ISO 4217 codes for org CRM display */
export const CRM_CURRENCY_OPTIONS: { value: string; label: string }[] = [
    { value: "USD", label: "USD — US dollar" },
    { value: "EUR", label: "EUR — Euro" },
    { value: "GBP", label: "GBP — British pound" },
    { value: "INR", label: "INR — Indian rupee" },
    { value: "JPY", label: "JPY — Japanese yen" },
    { value: "AUD", label: "AUD — Australian dollar" },
    { value: "CAD", label: "CAD — Canadian dollar" },
    { value: "CHF", label: "CHF — Swiss franc" },
    { value: "CNY", label: "CNY — Chinese yuan" },
    { value: "SEK", label: "SEK — Swedish krona" },
    { value: "NZD", label: "NZD — New Zealand dollar" },
    { value: "MXN", label: "MXN — Mexican peso" },
    { value: "SGD", label: "SGD — Singapore dollar" },
    { value: "HKD", label: "HKD — Hong Kong dollar" },
    { value: "NOK", label: "NOK — Norwegian krone" },
    { value: "TRY", label: "TRY — Turkish lira" },
    { value: "ZAR", label: "ZAR — South African rand" },
    { value: "BRL", label: "BRL — Brazilian real" },
    { value: "KRW", label: "KRW — South Korean won" },
    { value: "PLN", label: "PLN — Polish złoty" },
    { value: "DKK", label: "DKK — Danish krone" },
    { value: "AED", label: "AED — UAE dirham" },
    { value: "SAR", label: "SAR — Saudi riyal" },
    { value: "ILS", label: "ILS — Israeli shekel" },
    { value: "PHP", label: "PHP — Philippine peso" },
    { value: "THB", label: "THB — Thai baht" },
    { value: "MYR", label: "MYR — Malaysian ringgit" },
    { value: "IDR", label: "IDR — Indonesian rupiah" },
];

export const DEFAULT_CRM_CURRENCY = "USD";

export function normalizeCrmCurrencyCode(code: string | undefined): string {
    const c = (code ?? DEFAULT_CRM_CURRENCY).trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(c)) return c;
    return DEFAULT_CRM_CURRENCY;
}

/**
 * Format a numeric amount with the org currency. Returns em dash when amount is missing.
 */
export function formatCrmMoney(
    amount: number | undefined,
    currencyCode: string,
    options?: Intl.NumberFormatOptions,
): string {
    if (amount === undefined || Number.isNaN(amount)) return "—";
    const currency = normalizeCrmCurrencyCode(currencyCode);
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            ...options,
        }).format(amount);
    } catch {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: DEFAULT_CRM_CURRENCY,
            ...options,
        }).format(amount);
    }
}
