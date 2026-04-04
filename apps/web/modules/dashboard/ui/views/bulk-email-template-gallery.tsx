"use client";

import { cn } from "@workspace/ui/lib/utils";
import { LayoutTemplateIcon } from "lucide-react";

export type GalleryTemplate = {
    id: string;
    label: string;
    description?: string;
    category?: string;
    badge?: string;
};

function TemplateThumb() {
    return (
        <div className="flex aspect-[4/3] flex-col gap-2 rounded-lg bg-gradient-to-br from-violet-100/90 via-white to-indigo-100/80 p-3 ring-1 ring-violet-200/60">
            <div className="h-2 w-1/2 rounded bg-white/95 shadow-sm" />
            <div className="flex gap-2">
                <div className="h-16 flex-1 rounded-md bg-white/90 shadow-sm ring-1 ring-violet-100/50" />
                <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
                    <div className="h-2 w-full rounded bg-violet-200/50" />
                    <div className="h-2 w-4/5 rounded bg-indigo-200/40" />
                    <div className="h-2 w-3/5 rounded bg-slate-300/35" />
                </div>
            </div>
            <div className="mt-auto flex justify-center">
                <div className="h-7 w-28 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20" />
            </div>
        </div>
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
    const grouped = (() => {
        const list = templates ?? [];
        const orderFirst = ["Basic", "My templates"];
        const map = new Map<string, GalleryTemplate[]>();
        for (const t of list) {
            const cat = t.category ?? "Other";
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(t);
        }
        const keys = [...map.keys()].sort((a, b) => {
            const ia = orderFirst.indexOf(a);
            const ib = orderFirst.indexOf(b);
            if (ia >= 0 && ib >= 0) return ia - ib;
            if (ia >= 0) return -1;
            if (ib >= 0) return 1;
            return a.localeCompare(b);
        });
        return keys.map((k) => ({ category: k, items: map.get(k)! }));
    })();

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

            {templates === undefined ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-xl border bg-white p-4">
                            <div className="aspect-[4/3] rounded-lg bg-slate-100" />
                            <div className="mt-3 h-5 w-2/3 rounded bg-slate-100" />
                            <div className="mt-2 h-3 w-full rounded bg-slate-50" />
                        </div>
                    ))}
                </div>
            ) : (
                grouped.map(({ category, items }) => (
                    <section key={category}>
                        <h3 className="mb-4 border-l-4 border-violet-500 pl-3 text-lg font-semibold text-slate-800">
                            {category}
                        </h3>
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((t) => (
                                <li key={t.id}>
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
                                            <TemplateThumb />
                                            <div className="absolute inset-0 flex items-start justify-center bg-violet-950/0 pt-[22%] opacity-0 transition-all group-hover:bg-violet-950/40 group-hover:opacity-100">
                                                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-950 shadow-lg ring-1 ring-white/60">
                                                    Start with this
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-base font-semibold text-slate-900">{t.label}</p>
                                        {t.description ? (
                                            <p className="text-muted-foreground mt-1 line-clamp-3 text-sm leading-relaxed">
                                                {t.description}
                                            </p>
                                        ) : null}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))
            )}
        </div>
    );
}
