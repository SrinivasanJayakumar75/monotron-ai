/**
 * Optional `>> kicker`, `# headline`, `## subhead` at start of body (markdown-lite).
 * Used by HTML renderer and (optionally) the composer preview.
 */
export type ParsedBulkEmailBody = {
    kicker?: string;
    headline?: string;
    subhead?: string;
    body: string;
    /** Text after a standalone `---` line (muted footer paragraph) */
    footerNote?: string;
};

export function parseBulkEmailBodyStructure(raw: string): ParsedBulkEmailBody {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    let i = 0;
    let kicker: string | undefined;
    if (lines[i]?.startsWith(">> ")) {
        kicker = lines[i]!.slice(3).trim();
        i++;
        while (i < lines.length && lines[i]!.trim() === "") i++;
    }
    let headline: string | undefined;
    let subhead: string | undefined;
    if (lines[i]?.startsWith("# ")) {
        headline = lines[i]!.slice(2).trim();
        i++;
        while (i < lines.length && lines[i]!.trim() === "") i++;
        if (lines[i]?.startsWith("## ")) {
            subhead = lines[i]!.slice(3).trim();
            i++;
            while (i < lines.length && lines[i]!.trim() === "") i++;
        }
    } else if (lines[i]?.startsWith("## ")) {
        subhead = lines[i]!.slice(3).trim();
        i++;
        while (i < lines.length && lines[i]!.trim() === "") i++;
    }
    const joined = lines.slice(i).join("\n").replace(/^\n+/, "").trimEnd();
    const sep = "\n---\n";
    const ix = joined.indexOf(sep);
    let body = joined;
    let footerNote: string | undefined;
    if (ix >= 0) {
        body = joined.slice(0, ix).trimEnd();
        footerNote = joined.slice(ix + sep.length).trim();
    }
    return { kicker, headline, subhead, body, footerNote };
}
