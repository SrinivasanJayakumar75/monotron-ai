export type BulkRecipientInput = {
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    company?: string;
};

/** Minimal RFC-style CSV parse (quoted fields, commas). */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cur = "";
    let inQuotes = false;
    const pushCell = () => {
        row.push(cur);
        cur = "";
    };
    const pushRow = () => {
        if (row.length > 0 && row.some((c) => c.trim() !== "")) {
            rows.push(row);
        }
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const c = text[i]!;
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += c;
            }
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ",") pushCell();
            else if (c === "\n") {
                pushCell();
                pushRow();
            } else if (c === "\r") {
                pushCell();
                if (text[i + 1] === "\n") i++;
                pushRow();
            } else {
                cur += c;
            }
        }
    }
    pushCell();
    if (row.length > 0 && row.some((c) => c.trim() !== "")) {
        rows.push(row);
    }
    return rows;
}

function fieldForHeader(header: string): keyof BulkRecipientInput | null {
    const h = header
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
    if (h === "email" || h === "e_mail" || h === "email_address" || h === "mail") return "email";
    if (h === "first_name" || h === "firstname" || h === "first") return "firstName";
    if (h === "last_name" || h === "lastname" || h === "last") return "lastName";
    if (h === "name" || h === "full_name" || h === "fullname") return "name";
    if (h === "company" || h === "organization" || h === "org") return "company";
    return null;
}

export function parseBulkEmailRecipientsFromCsv(csvText: string): {
    recipients: BulkRecipientInput[];
    error?: string;
} {
    const table = parseCsv(csvText);
    if (table.length < 2) {
        return { recipients: [], error: "CSV must include a header row and at least one data row." };
    }
    const headers = table[0]!.map((h) => h.trim());
    const colMap: (keyof BulkRecipientInput | null)[] = headers.map((h) => fieldForHeader(h));
    const emailCol = colMap.indexOf("email");
    if (emailCol < 0) {
        return {
            recipients: [],
            error: "CSV must include an email column (e.g. `email`).",
        };
    }

    const recipients: BulkRecipientInput[] = [];
    for (const cells of table.slice(1)) {
        const email = (cells[emailCol] ?? "").trim();
        if (!email) continue;
        const row: BulkRecipientInput = { email };
        for (let c = 0; c < colMap.length; c++) {
            const key = colMap[c];
            if (!key || key === "email") continue;
            const val = (cells[c] ?? "").trim();
            if (val) row[key] = val;
        }
        recipients.push(row);
    }

    return { recipients: dedupeByEmail(recipients) };
}

function dedupeByEmail(rows: BulkRecipientInput[]): BulkRecipientInput[] {
    const seen = new Set<string>();
    const out: BulkRecipientInput[] = [];
    for (const r of rows) {
        const k = r.email.trim().toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ ...r, email: k });
    }
    return out;
}

export const SAMPLE_BULK_EMAIL_CSV = `email,first_name,last_name,company
alice@example.com,Alice,Smith,Acme Inc
bob@example.com,Bob,Lee,Contoso
`;
