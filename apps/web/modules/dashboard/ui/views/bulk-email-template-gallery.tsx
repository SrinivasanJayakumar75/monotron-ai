"use client";

import { BULK_EMAIL_THEMES, type BulkEmailThemeId } from "@workspace/backend/lib/bulkEmailThemes";
import { cn } from "@workspace/ui/lib/utils";
import { LayoutTemplateIcon } from "lucide-react";

export type GalleryTemplate = {
    id: string;
    label: string;
    description?: string;
    category?: string;
    badge?: string;
    /** Theme label for badge, e.g. "Coral pop" */
    theme?: string;
    /** For colorful thumbnail preview */
    themeId?: BulkEmailThemeId;
};

function TemplateThumb({ themeId }: { themeId?: BulkEmailThemeId }) {
    const th = themeId && themeId in BULK_EMAIL_THEMES ? BULK_EMAIL_THEMES[themeId] : BULK_EMAIL_THEMES.indigo;
    const accent = th.accent;
    const softBg = th.outerBg;
    const outline = th.ctaStyle === "outline";
    const hero = th.topHero;

    return (
        <div
            className="flex aspect-[4/3] flex-col gap-0 overflow-hidden rounded-lg ring-1 ring-black/5"
            style={{ background: softBg }}
        >
            {hero === "notify_check" ? (
                <div
                    className="flex shrink-0 items-center justify-center py-4 text-3xl font-light text-white"
                    style={{ background: accent }}
                >
                    &#10003;
                </div>
            ) : null}
            {hero === "verify_panel" ? (
                <div className="flex shrink-0 flex-col items-center py-3 text-white" style={{ background: accent }}>
                    <span className="text-[8px] font-bold tracking-[0.2em] opacity-90">VERIFY</span>
                    <span className="mt-1 text-2xl leading-none">&#9993;</span>
                </div>
            ) : null}
            {hero === "thin_bar" ? <div className="h-1.5 w-full shrink-0" style={{ background: accent }} /> : null}
            {hero === "brand_bar" ? (
                <div className="flex shrink-0 items-center justify-center bg-slate-950 py-2.5">
                    <span className="max-w-[95%] truncate text-center text-[7px] font-extrabold uppercase tracking-[0.32em] text-slate-100">
                        YOUR EVENT
                    </span>
                </div>
            ) : null}
            {"imageRole" in th && th.imageRole === "top_left_logo" ? (
                <div className="flex shrink-0 justify-start bg-white px-3 py-2">
                    <div
                        className="h-7 w-[4.5rem] rounded border border-slate-200 bg-slate-100"
                        style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)" }}
                    />
                </div>
            ) : null}
            {hero === "promo_sunrise" ? (
                <div
                    className="flex shrink-0 items-stretch justify-between gap-1 px-2 py-2"
                    style={{
                        background: "linear-gradient(127deg,#fde047 0%,#fbbf24 45%,#ea580c 100%)",
                    }}
                >
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        <div className="h-1.5 w-3/4 rounded bg-slate-900/25" />
                        <div
                            className="h-5 w-14 shrink-0 rounded-full"
                            style={{ background: accent, boxShadow: `0 2px 8px ${accent}55` }}
                        />
                    </div>
                    <div className="flex w-10 flex-col items-center justify-center">
                        <span className="text-lg font-black leading-none text-slate-900">40</span>
                        <span className="text-[7px] font-bold text-emerald-900">%</span>
                    </div>
                </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                <div className="rounded-md bg-white/95 p-2 shadow-sm ring-1 ring-black/[0.06]">
                    <div className="mb-1.5 h-1.5 w-16 rounded-full" style={{ background: `${accent}44` }} />
                    <div className="mb-2 h-2.5 w-4/5 rounded" style={{ background: `${accent}33` }} />
                    <div className="space-y-1.5">
                        <div className="h-1.5 w-full rounded bg-slate-200/90" />
                        <div className="h-1.5 w-[92%] rounded bg-slate-200/70" />
                        <div className="h-1.5 w-2/3 rounded bg-slate-200/60" />
                    </div>
                </div>
                <div className="mt-auto flex justify-center pt-1">
                    {outline ? (
                        <div
                            className="h-7 w-[7.5rem] rounded-full border-2 bg-white shadow-sm"
                            style={{ borderColor: accent }}
                        />
                    ) : (
                        <div
                            className="h-7 w-[7.5rem] rounded-full shadow-md"
                            style={{
                                background: `linear-gradient(90deg, ${accent}, ${accent})`,
                                boxShadow: `0 4px 14px ${accent}44`,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function GalleryTemplateCard({ t, onSelect }: { t: GalleryTemplate; onSelect: (id: string) => void }) {
    return (
        <li>
            <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={cn(
                    "group relative w-full rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-all",
                    "hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                )}
            >
                {t.badge === "new" ? (
                    <span className="absolute left-3 top-3 z-[1] rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        New
                    </span>
                ) : null}
                <div className="relative overflow-hidden rounded-lg">
                    <TemplateThumb themeId={t.themeId} />
                    <div className="absolute inset-0 flex items-start justify-center bg-violet-950/0 pt-[22%] opacity-0 transition-all group-hover:bg-violet-950/40 group-hover:opacity-100">
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-950 shadow-lg ring-1 ring-white/60">
                            Start with this
                        </span>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">{t.label}</p>
                    {t.theme ? (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                            {t.theme}
                        </span>
                    ) : null}
                </div>
                {t.description ? (
                    <p className="text-muted-foreground mt-1 line-clamp-3 text-sm leading-relaxed">{t.description}</p>
                ) : null}
            </button>
        </li>
    );
}

export function BulkEmailTemplateGallery({
    templates,
    onSelect,
    title = "Choose a layout",
}: {
    templates: GalleryTemplate[] | undefined;
    onSelect: (id: string) => void;
    title?: string;
}) {
    const items = templates ?? [];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700/90">
                        Campaign studio
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{title}</h2>
                    <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                        Pick a layout to start — you will refine copy, audience, and delivery in the composer.
                    </p>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/15 to-indigo-600/10 text-violet-800 ring-1 ring-violet-300/50">
                    <LayoutTemplateIcon className="size-6" aria-hidden />
                </div>
            </div>

            {!templates || templates.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-xl border bg-white p-4">
                            <div className="aspect-[4/3] rounded-lg bg-slate-100" />
                            <div className="mt-3 h-5 w-2/3 rounded bg-slate-100" />
                            <div className="mt-2 h-3 w-full rounded bg-slate-50" />
                        </div>
                    ))}
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {items.map((t) => (
                        <GalleryTemplateCard key={t.id} t={t} onSelect={onSelect} />
                    ))}
                </ul>
            )}
        </div>
    );
}
