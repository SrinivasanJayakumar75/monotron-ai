"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type ChangeEventHandler, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Trash2Icon } from "lucide-react";

type Account = Doc<"accounts">;

export const AccountsView = () => {
    const accounts = useQuery(api.private.accounts.list);
    const createAccount = useMutation(api.private.accounts.create);
    const removeAccount = useMutation(api.private.accounts.remove);
    const importAccountsCsv = useMutation((api as any).private.accounts.importCsv);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [industry, setIndustry] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [search, setSearch] = useState("");
    const [industryFilter, setIndustryFilter] = useState("all");
    const [websiteFilter, setWebsiteFilter] = useState("all");
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");

    const industryOptions = useMemo(() => {
        const vals = Array.from(
            new Set((accounts ?? []).map((a) => (a.industry ?? "").trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b));
        return vals;
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        const rows = accounts ?? [];
        const byFilter = rows.filter((a) => {
            const industryOk = industryFilter === "all" ? true : (a.industry ?? "") === industryFilter;
            const websiteOk =
                websiteFilter === "all"
                    ? true
                    : websiteFilter === "yes"
                      ? Boolean(a.website?.trim())
                      : !Boolean(a.website?.trim());
            const fromMs = createdFrom ? new Date(createdFrom + "T00:00:00").getTime() : undefined;
            const toMs = createdTo ? new Date(createdTo + "T23:59:59.999").getTime() : undefined;
            const createdOk =
                (fromMs === undefined || a._creationTime >= fromMs) &&
                (toMs === undefined || a._creationTime <= toMs);
            return industryOk && websiteOk && createdOk;
        });
        const q = search.trim().toLowerCase();
        if (!q) return byFilter;
        return byFilter.filter((a) =>
            [a.name, a.industry, a.website, a.phone, a.email]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [accounts, industryFilter, websiteFilter, createdFrom, createdTo, search]);

    const exportFiltered = () => {
        const headers = ["name", "website", "industry", "phone", "email", "created_at"];
        const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const rows = filteredAccounts.map((a) =>
            [
                a.name,
                a.website ?? "",
                a.industry ?? "",
                a.phone ?? "",
                a.email ?? "",
                new Date(a._creationTime).toISOString(),
            ]
                .map((v) => escape(String(v)))
                .join(","),
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `accounts-export-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Accounts exported");
    };

    const handleCreate = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Account name is required");
            return;
        }

        setIsCreating(true);
        try {
            await createAccount({
                name: trimmedName,
                website: website.trim() || undefined,
                industry: industry.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
            });
            setName("");
            setWebsite("");
            setIndustry("");
            setPhone("");
            setEmail("");
            toast.success("Account created");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create account";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (accountId: Id<"accounts">) => {
        try {
            await removeAccount({ accountId });
            toast.success("Account deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete account";
            toast.error(message);
        }
    };

    const onImportCsv: ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const csv = await file.text();
        try {
            const result = await importAccountsCsv({ csv });
            toast.success(`Imported ${result.imported} account${result.imported === 1 ? "" : "s"}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Import failed");
        } finally {
            e.target.value = "";
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl md:text-4xl">Accounts</h1>
                            <p className="text-muted-foreground">Manage companies and organizations.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                Import accounts
                            </Button>
                            <Button variant="outline" onClick={exportFiltered}>
                                Export data
                            </Button>
                            <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => setShowCreateForm((v) => !v)}>
                                {showCreateForm ? "Hide form" : "Create account"}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={onImportCsv}
                            />
                        </div>
                    </div>
                    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white/80 p-3 md:grid-cols-5">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, website, phone, email..." />
                        <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={industryFilter}
                            onChange={(e) => setIndustryFilter(e.target.value)}
                        >
                            <option value="all">All industries</option>
                            {industryOptions.map((industry) => (
                                <option key={industry} value={industry}>
                                    {industry}
                                </option>
                            ))}
                        </select>
                        <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={websiteFilter}
                            onChange={(e) => setWebsiteFilter(e.target.value)}
                        >
                            <option value="all">All accounts</option>
                            <option value="yes">Has website</option>
                            <option value="no">Missing website</option>
                        </select>
                        <Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
                        <Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
                    </div>
                </div>

                {showCreateForm && (
                <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="md:col-span-2 space-y-1">
                            <Label>Account name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
                        </div>
                        <div className="space-y-1">
                            <Label>Website</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
                        </div>
                        <div className="space-y-1">
                            <Label>Industry</Label>
                            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 ..." />
                        </div>
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sales@acme.com" />
                        </div>
                        <div className="md:col-span-5 flex items-end">
                            <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleCreate} disabled={isCreating}>
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
                )}

                <div className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Website</TableHead>
                                <TableHead>Industry</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : filteredAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No accounts match your filters
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAccounts.map((account: Account) => (
                                    <TableRow key={account._id}>
                                        <TableCell className="font-medium">
                                            <Link className="text-indigo-700 hover:underline" href={`/crm/accounts/${account._id}`}>
                                                {account.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{account.website ?? "—"}</TableCell>
                                        <TableCell>{account.industry ?? "—"}</TableCell>
                                        <TableCell>{account.phone ?? "—"}</TableCell>
                                        <TableCell>{account.email ?? "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(account._id)}
                                                aria-label={`Delete ${account.name}`}
                                            >
                                                <Trash2Icon className="size-4 text-destructive" />
                                            </Button>
                                        </TableCell>
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

