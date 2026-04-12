"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type ChangeEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

const PRODUCT_TYPES = [
    { value: "inventory", label: "Inventory" },
    { value: "non_inventory", label: "Non-inventory" },
    { value: "service", label: "Service" },
] as const;

type ProductType = (typeof PRODUCT_TYPES)[number]["value"];

function parseOptionalNumber(value: string): number | undefined {
    const t = value.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
}

function formatMarginPercent(unitPrice?: number, unitCost?: number) {
    if (unitPrice === undefined || unitCost === undefined) return "—";
    if (unitPrice <= 0) return "—";
    const pct = ((unitPrice - unitCost) / unitPrice) * 100;
    return `${pct.toFixed(1)}%`;
}

function productTypeLabel(t?: ProductType) {
    if (!t) return "—";
    return PRODUCT_TYPES.find((p) => p.value === t)?.label ?? t;
}

function formatMoney(n?: number) {
    if (n === undefined) return "—";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;

async function uploadProductImageToStorage(
    file: File,
    getUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
    if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file (PNG, JPG, WebP, GIF, or SVG).");
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
        throw new Error("Image must be 8MB or smaller.");
    }
    const postUrl = await getUploadUrl();
    const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
    });
    if (!result.ok) {
        throw new Error("Image upload failed. Try again.");
    }
    const json = (await result.json()) as { storageId?: string };
    if (!json.storageId) {
        throw new Error("Image upload did not complete.");
    }
    return json.storageId as Id<"_storage">;
}

type ModuleKey =
    | "products"
    | "quotes"
    | "orders"
    | "invoices"
    | "payments"
    | "contracts"
    | "documents"
    | "approvals";

function toTimestamp(dateStr: string): number | undefined {
    const trimmed = dateStr.trim();
    if (!trimmed) return undefined;
    const ms = new Date(trimmed).getTime();
    return Number.isNaN(ms) ? undefined : ms;
}

function formatDate(ms?: number) {
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString();
}

function formatDateTime(ms?: number) {
    if (!ms) return "—";
    return new Date(ms).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
    });
}

function dayStartMs(isoDate: string) {
    return new Date(isoDate + "T00:00:00").getTime();
}

function dayEndMs(isoDate: string) {
    return new Date(isoDate + "T23:59:59.999").getTime();
}

function escapeCsvCell(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/** Minimal RFC-style CSV parse (quoted fields, commas, newlines). */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let i = 0;
    let inQuotes = false;
    while (i < text.length) {
        const c = text[i]!;
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            field += c;
            i += 1;
            continue;
        }
        if (c === '"') {
            inQuotes = true;
            i += 1;
            continue;
        }
        if (c === ",") {
            row.push(field);
            field = "";
            i += 1;
            continue;
        }
        if (c === "\r") {
            i += 1;
            continue;
        }
        if (c === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
            i += 1;
            continue;
        }
        field += c;
        i += 1;
    }
    row.push(field);
    if (row.length > 1 || field.length > 0) {
        rows.push(row);
    }
    return rows;
}

function normalizeCsvHeader(h: string) {
    return h.replace(/^\ufeff/, "").trim().toLowerCase().replace(/\s+/g, "_");
}

function parseProductTypeFromImport(raw: string): ProductType | undefined {
    const t = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (t === "noninventory") return "non_inventory";
    if (t === "inventory" || t === "non_inventory" || t === "service") return t as ProductType;
    return undefined;
}

function parseOptionalStatusForImport(raw: string, allowed: string[]): string | undefined {
    const s = raw.trim().toLowerCase();
    if (!s) return undefined;
    const hit = allowed.find((a) => a.toLowerCase() === s);
    return hit;
}

type ProductImportRow = {
    title: string;
    status?: string;
    sku?: string;
    productDescription?: string;
    productUrl?: string;
    unitPrice?: number;
    unitCost?: number;
    productType?: ProductType;
    stockQuantity?: number;
};

function buildProductRowsFromCsv(
    text: string,
    allowedStatuses: string[],
): { rows: ProductImportRow[]; errors: string[] } {
    const grid = parseCsv(text);
    if (grid.length < 2) {
        return { rows: [], errors: ["CSV must include a header row and at least one data row."] };
    }
    const header = grid[0]!.map(normalizeCsvHeader);
    const idx = (name: string) => {
        const j = header.indexOf(name);
        return j === -1 ? undefined : j;
    };
    const col = (aliases: string[]) => {
        for (const a of aliases) {
            const j = idx(a);
            if (j !== undefined) return j;
        }
        return undefined;
    };
    const titleCol = col(["name", "title", "product_name"]);
    if (titleCol === undefined) {
        return { rows: [], errors: ['Missing required column: use "name" or "title" for the product name.'] };
    }
    const skuCol = col(["sku", "product_sku"]);
    const descCol = col(["description", "product_description", "desc"]);
    const urlCol = col(["url", "product_url", "link"]);
    const priceCol = col(["unit_price", "price", "unitprice"]);
    const costCol = col(["unit_cost", "cost", "unitcost"]);
    const typeCol = col(["product_type", "type"]);
    const statusCol = col(["status"]);
    const stockCol = col(["stock_quantity", "stock", "qty", "quantity"]);

    const rows: ProductImportRow[] = [];
    const errors: string[] = [];

    for (let r = 1; r < grid.length; r++) {
        const cells = grid[r]!;
        const lineNo = r + 1;
        const title = (cells[titleCol] ?? "").trim();
        if (!title) continue;

        let unitPrice: number | undefined;
        if (priceCol !== undefined) {
            const p = (cells[priceCol] ?? "").trim();
            if (p) {
                const n = Number(p);
                if (!Number.isFinite(n)) {
                    errors.push(`Line ${lineNo}: invalid unit_price`);
                    continue;
                }
                unitPrice = n;
            }
        }
        let unitCost: number | undefined;
        if (costCol !== undefined) {
            const p = (cells[costCol] ?? "").trim();
            if (p) {
                const n = Number(p);
                if (!Number.isFinite(n)) {
                    errors.push(`Line ${lineNo}: invalid unit_cost`);
                    continue;
                }
                unitCost = n;
            }
        }
        let stockQuantity: number | undefined;
        if (stockCol !== undefined) {
            const p = (cells[stockCol] ?? "").trim();
            if (p) {
                const n = Number(p);
                if (!Number.isFinite(n)) {
                    errors.push(`Line ${lineNo}: invalid stock_quantity`);
                    continue;
                }
                stockQuantity = n;
            }
        }

        let productType: ProductType | undefined;
        if (typeCol !== undefined) {
            const raw = (cells[typeCol] ?? "").trim();
            if (raw) {
                productType = parseProductTypeFromImport(raw);
                if (!productType) {
                    errors.push(
                        `Line ${lineNo}: product_type must be inventory, non_inventory (or non-inventory), or service`,
                    );
                    continue;
                }
            }
        }

        let status: string | undefined;
        if (statusCol !== undefined) {
            const raw = (cells[statusCol] ?? "").trim();
            if (raw) {
                const s = parseOptionalStatusForImport(raw, allowedStatuses);
                if (!s) {
                    errors.push(`Line ${lineNo}: status must be one of: ${allowedStatuses.join(", ")}`);
                    continue;
                }
                status = s;
            }
        }

        rows.push({
            title,
            status,
            sku: skuCol !== undefined ? (cells[skuCol] ?? "").trim() || undefined : undefined,
            productDescription:
                descCol !== undefined ? (cells[descCol] ?? "").trim() || undefined : undefined,
            productUrl: urlCol !== undefined ? (cells[urlCol] ?? "").trim() || undefined : undefined,
            unitPrice,
            unitCost,
            productType,
            stockQuantity,
        });
    }

    return { rows, errors };
}

const PRODUCT_CSV_HEADERS = [
    "name",
    "sku",
    "description",
    "url",
    "unit_price",
    "unit_cost",
    "product_type",
    "status",
    "stock_quantity",
    "created_at",
] as const;

function ProductStockInput({
    itemId,
    quantity,
    onCommit,
    onAdjust,
}: {
    itemId: Id<"crmModuleItems">;
    quantity?: number;
    onCommit: (id: Id<"crmModuleItems">, next: number | null) => void;
    onAdjust: (id: Id<"crmModuleItems">, delta: number) => void;
}) {
    const [local, setLocal] = useState(quantity === undefined ? "" : String(quantity));
    useEffect(() => {
        setLocal(quantity === undefined ? "" : String(quantity));
    }, [quantity, itemId]);

    return (
        <div className="flex items-center justify-end gap-0.5">
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Decrease stock by 1"
                onClick={() => onAdjust(itemId, -1)}
            >
                <span className="text-lg leading-none">−</span>
            </Button>
            <Input
                className="h-8 w-[4.25rem] tabular-nums"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={() => {
                    const t = local.trim();
                    if (t === "") {
                        if (quantity !== undefined) onCommit(itemId, null);
                        return;
                    }
                    const n = Number(t);
                    if (!Number.isFinite(n)) {
                        setLocal(quantity === undefined ? "" : String(quantity));
                        toast.error("Stock must be a number");
                        return;
                    }
                    if (n !== quantity) onCommit(itemId, n);
                }}
            />
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Increase stock by 1"
                onClick={() => onAdjust(itemId, 1)}
            >
                <span className="text-lg leading-none">+</span>
            </Button>
        </div>
    );
}

export const CrmModuleItemsView = ({
    module,
    title,
    description,
    statuses = ["draft", "active", "completed"],
}: {
    module: ModuleKey;
    title: string;
    description: string;
    statuses?: string[];
}) => {
    const items = useQuery(api.private.crmModules.list, { module });
    const createItem = useMutation(api.private.crmModules.create);
    const updateStatus = useMutation(api.private.crmModules.updateStatus);
    const removeItem = useMutation(api.private.crmModules.remove);
    const bulkCreateProducts = useMutation(api.private.crmModules.bulkCreateProducts);
    const updateProductStock = useMutation(api.private.crmModules.updateProductStock);
    const adjustProductStockDelta = useMutation(api.private.crmModules.adjustProductStock);
    const updateProduct = useMutation(api.private.crmModules.updateProduct);
    const generateProductImageUploadUrl = useMutation(api.private.crmModules.generateProductImageUploadUrl);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [productImageInputKey, setProductImageInputKey] = useState(0);
    const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<Id<"crmModuleItems"> | null>(null);
    const [existingProductImageUrl, setExistingProductImageUrl] = useState<string | null>(null);
    const [stripProductImageOnUpdate, setStripProductImageOnUpdate] = useState(false);

    const [name, setName] = useState("");
    const [status, setStatus] = useState(statuses[0] ?? "draft");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [details, setDetails] = useState("");
    const [sku, setSku] = useState("");
    const [productDescription, setProductDescription] = useState("");
    const [productUrl, setProductUrl] = useState("");
    const [unitPrice, setUnitPrice] = useState("");
    const [unitCost, setUnitCost] = useState("");
    const [productType, setProductType] = useState<ProductType>("inventory");
    const [stockQuantity, setStockQuantity] = useState("");
    const [productImageFile, setProductImageFile] = useState<File | null>(null);
    const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const isProducts = module === "products";

    const filteredItems = useMemo(() => {
        if (items === undefined) return undefined;
        if (!isProducts) return items;
        let rows = items;
        if (statusFilter !== "all") {
            rows = rows.filter((it) => (it.status ?? "active") === statusFilter);
        }
        if (createdFrom.trim()) {
            const t = dayStartMs(createdFrom.trim());
            rows = rows.filter((it) => it.createdAt >= t);
        }
        if (createdTo.trim()) {
            const t = dayEndMs(createdTo.trim());
            rows = rows.filter((it) => it.createdAt <= t);
        }
        return rows;
    }, [items, isProducts, statusFilter, createdFrom, createdTo]);

    const shouldShowAmount = useMemo(
        () => ["quotes", "orders", "invoices", "payments", "contracts"].includes(module),
        [module]
    );
    const shouldShowDate = useMemo(() => module !== "products", [module]);

    const resetProductForm = () => {
        setName("");
        setStatus(statuses[0] ?? "draft");
        setSku("");
        setProductDescription("");
        setProductUrl("");
        setUnitPrice("");
        setUnitCost("");
        setProductType("inventory");
        setStockQuantity("");
        setProductImageFile(null);
        setProductImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setProductImageInputKey((k) => k + 1);
        setEditingProductId(null);
        setExistingProductImageUrl(null);
        setStripProductImageOnUpdate(false);
    };

    const handleProductImageChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const f = e.target.files?.[0];
        setProductImageFile(f ?? null);
        setStripProductImageOnUpdate(false);
        setProductImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return f ? URL.createObjectURL(f) : null;
        });
    };

    const clearProductImageSelection = () => {
        if (productImageFile || productImagePreviewUrl) {
            setProductImageFile(null);
            setProductImagePreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            setProductImageInputKey((k) => k + 1);
            return;
        }
        if (existingProductImageUrl) {
            setExistingProductImageUrl(null);
            setStripProductImageOnUpdate(true);
        }
    };

    const openEditProduct = (item: Doc<"crmModuleItems"> & { productImageUrl?: string | null }) => {
        setEditingProductId(item._id);
        setName(item.title);
        setStatus(item.status ?? (statuses[0] ?? "active"));
        setSku(item.sku ?? "");
        setProductDescription(item.productDescription ?? "");
        setProductUrl(item.productUrl ?? "");
        setUnitPrice(item.unitPrice !== undefined ? String(item.unitPrice) : "");
        setUnitCost(item.unitCost !== undefined ? String(item.unitCost) : "");
        setProductType((item.productType as ProductType | undefined) ?? "inventory");
        setStockQuantity(item.stockQuantity !== undefined ? String(item.stockQuantity) : "");
        setProductImageFile(null);
        setProductImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setProductImageInputKey((k) => k + 1);
        const url = (item as { productImageUrl?: string | null }).productImageUrl;
        setExistingProductImageUrl(url ?? null);
        setStripProductImageOnUpdate(false);
        setProductDialogOpen(true);
    };

    const handleSaveProduct = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error(`${title} name is required`);
            return;
        }
        if (isProducts) {
            const up = parseOptionalNumber(unitPrice);
            const uc = parseOptionalNumber(unitCost);
            const sq = parseOptionalNumber(stockQuantity);
            if (unitPrice.trim() && up === undefined) {
                toast.error("Unit price must be a valid number");
                return;
            }
            if (unitCost.trim() && uc === undefined) {
                toast.error("Unit cost must be a valid number");
                return;
            }
            if (stockQuantity.trim() && sq === undefined) {
                toast.error("Stock quantity must be a valid number");
                return;
            }
        }
        setIsCreating(true);
        try {
            if (isProducts && editingProductId) {
                let newImageId: Id<"_storage"> | undefined;
                if (productImageFile) {
                    newImageId = await uploadProductImageToStorage(productImageFile, () =>
                        generateProductImageUploadUrl({}),
                    );
                }
                const imagePatch: { productImageId?: Id<"_storage"> | null } = {};
                if (productImageFile && newImageId) {
                    imagePatch.productImageId = newImageId;
                } else if (stripProductImageOnUpdate) {
                    imagePatch.productImageId = null;
                }
                await updateProduct({
                    itemId: editingProductId,
                    title: trimmed,
                    status,
                    sku: sku.trim() || undefined,
                    productDescription: productDescription.trim() || undefined,
                    productUrl: productUrl.trim() || undefined,
                    unitPrice: parseOptionalNumber(unitPrice),
                    unitCost: parseOptionalNumber(unitCost),
                    productType,
                    stockQuantity: parseOptionalNumber(stockQuantity),
                    ...imagePatch,
                });
                resetProductForm();
                setProductDialogOpen(false);
                toast.success("Product updated");
            } else if (isProducts) {
                let productImageId: Id<"_storage"> | undefined;
                if (productImageFile) {
                    productImageId = await uploadProductImageToStorage(productImageFile, () =>
                        generateProductImageUploadUrl({}),
                    );
                }
                await createItem({
                    module,
                    title: trimmed,
                    status,
                    sku: sku.trim() || undefined,
                    productDescription: productDescription.trim() || undefined,
                    productUrl: productUrl.trim() || undefined,
                    unitPrice: parseOptionalNumber(unitPrice),
                    unitCost: parseOptionalNumber(unitCost),
                    productType,
                    stockQuantity: parseOptionalNumber(stockQuantity),
                    productImageId,
                });
                resetProductForm();
                setProductDialogOpen(false);
                toast.success("Product created");
            } else {
                await createItem({
                    module,
                    title: trimmed,
                    status,
                    amount: shouldShowAmount && amount.trim() ? Number(amount) : undefined,
                    dueAt: shouldShowDate ? toTimestamp(dueDate) : undefined,
                    details: details.trim() || undefined,
                });
                setDetails("");
                setName("");
                setStatus(statuses[0] ?? "draft");
                setAmount("");
                setDueDate("");
                toast.success(`${title} item created`);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to save";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreate = async () => {
        await handleSaveProduct();
    };

    const handleDelete = async (itemId: Id<"crmModuleItems">) => {
        try {
            await removeItem({ itemId });
            toast.success("Item deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete item";
            toast.error(message);
        }
    };

    const handleStatusChange = async (itemId: Id<"crmModuleItems">, nextStatus: string) => {
        try {
            await updateStatus({ itemId, status: nextStatus });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to update status";
            toast.error(message);
        }
    };

    const handleStockCommit = async (itemId: Id<"crmModuleItems">, next: number | null) => {
        try {
            await updateProductStock({ itemId, stockQuantity: next });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to update stock";
            toast.error(message);
        }
    };

    const handleStockAdjust = async (itemId: Id<"crmModuleItems">, delta: number) => {
        try {
            await adjustProductStockDelta({ itemId, delta });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to adjust stock";
            toast.error(message);
        }
    };

    const handleExportProductsCsv = () => {
        if (!isProducts || items === undefined || items.length === 0) {
            toast.error("Nothing to export");
            return;
        }
        const source = filteredItems ?? [];
        if (source.length === 0) {
            toast.error("Nothing to export for this filter");
            return;
        }
        const header = PRODUCT_CSV_HEADERS.join(",");
        const lines = [header];
        for (const it of source) {
            lines.push(
                [
                    escapeCsvCell(it.title),
                    escapeCsvCell(it.sku ?? ""),
                    escapeCsvCell(it.productDescription ?? ""),
                    escapeCsvCell(it.productUrl ?? ""),
                    escapeCsvCell(it.unitPrice !== undefined ? String(it.unitPrice) : ""),
                    escapeCsvCell(it.unitCost !== undefined ? String(it.unitCost) : ""),
                    escapeCsvCell(it.productType ?? ""),
                    escapeCsvCell(it.status ?? "active"),
                    escapeCsvCell(it.stockQuantity !== undefined ? String(it.stockQuantity) : ""),
                    escapeCsvCell(new Date(it.createdAt).toISOString()),
                ].join(","),
            );
        }
        const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${source.length} row(s)`);
    };

    const handleImportProductsCsv: ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setIsImporting(true);
        try {
            const text = await file.text();
            const { rows, errors } = buildProductRowsFromCsv(text, statuses);
            if (errors.length > 0) {
                toast.error(errors.slice(0, 8).join(" · "));
            }
            if (rows.length === 0) {
                if (errors.length === 0) toast.error("No product rows found in file");
                return;
            }
            const batchSize = 40;
            let created = 0;
            for (let i = 0; i < rows.length; i += batchSize) {
                const chunk = rows.slice(i, i + batchSize);
                const res = await bulkCreateProducts({ rows: chunk });
                created += res.created;
            }
            toast.success(`Imported ${created} product(s)`);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Import failed";
            toast.error(message);
        } finally {
            setIsImporting(false);
        }
    };

    const previewMargin = formatMarginPercent(
        parseOptionalNumber(unitPrice),
        parseOptionalNumber(unitCost),
    );

    const productFormFields = (
        <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2 space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-1">
                <Label>SKU</Label>
                <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Stock keeping unit"
                />
            </div>
            <div className="md:col-span-2 space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 border-slate-300">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {statuses.map((s) => (
                            <SelectItem key={s} value={s}>
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
                <Label>Product type</Label>
                <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
                    <SelectTrigger className="h-9 border-slate-300">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PRODUCT_TYPES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                                {p.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label>Unit price</Label>
                <Input
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="border-slate-300"
                />
            </div>
            <div className="space-y-1">
                <Label>Unit cost</Label>
                <Input
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="border-slate-300"
                />
            </div>
            <div className="space-y-1">
                <Label>Margin (gross %)</Label>
                <div className="flex h-9 items-center rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-muted-foreground">
                    {previewMargin}
                </div>
            </div>
            <div className="space-y-1">
                <Label>Stock quantity</Label>
                <Input
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    inputMode="decimal"
                    placeholder="Optional"
                    className="border-slate-300"
                />
            </div>
            <div className="md:col-span-6 space-y-1">
                <Label>Product URL</Label>
                <Input
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://"
                    className="border-slate-300"
                />
            </div>
            <div className="md:col-span-6 space-y-1">
                <Label>Product description</Label>
                <Textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Describe this product or service"
                    rows={3}
                    className="min-h-[80px] resize-y border-slate-300"
                />
            </div>
            <div className="md:col-span-6 space-y-2">
                <Label>Product image</Label>
                <Input
                    key={productImageInputKey}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="h-auto min-h-9 cursor-pointer border-slate-300 py-1.5 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-sm"
                    onChange={handleProductImageChange}
                />
                <p className="text-muted-foreground text-xs">
                    Choose a file from your computer. It is uploaded to secure storage (not pasted as a URL).
                </p>
                {(productImagePreviewUrl ||
                    (existingProductImageUrl && !stripProductImageOnUpdate)) && (
                    <div className="flex items-center gap-3">
                        <img
                            src={productImagePreviewUrl ?? existingProductImageUrl!}
                            alt=""
                            className="size-24 rounded-md border border-slate-200 object-cover"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={clearProductImageSelection}>
                            Remove image
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div
            className={cn(
                "flex min-h-screen min-w-0 flex-col",
                isProducts ? "w-full bg-[#f5f8fa]" : "bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8",
            )}
        >
            <div
                className={cn(
                    "mx-auto w-full min-w-0",
                    isProducts ? "max-w-[1600px] flex-1 px-4 py-5 md:px-6 md:py-6" : "max-w-screen-lg",
                )}
            >
                {isProducts ? (
                    <>
                        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h1>
                                <p className="text-muted-foreground text-sm">
                                    {description}
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {items === undefined ? (
                                        "Loading records…"
                                    ) : filteredItems!.length === items.length ? (
                                        <>
                                            <span className="font-medium text-slate-700">
                                                {items.length.toLocaleString()}
                                            </span>{" "}
                                            records
                                        </>
                                    ) : (
                                        <>
                                            Showing{" "}
                                            <span className="font-medium text-slate-700">
                                                {filteredItems!.length.toLocaleString()}
                                            </span>{" "}
                                            of{" "}
                                            <span className="font-medium text-slate-700">
                                                {items.length.toLocaleString()}
                                            </span>{" "}
                                            records (filters applied)
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    className={cn("gap-2", CRM_PRIMARY_BTN)}
                                    onClick={() => {
                                        resetProductForm();
                                        setProductDialogOpen(true);
                                    }}
                                >
                                    <PlusIcon className="size-4" />
                                    Create product
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-slate-300 bg-white shadow-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                >
                                    {isImporting ? "Importing…" : "Import CSV"}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={handleImportProductsCsv}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-slate-300 bg-white shadow-sm"
                                    onClick={handleExportProductsCsv}
                                    disabled={items === undefined || items.length === 0}
                                >
                                    Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="mb-3 border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600">Status</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-9 w-[200px] border-slate-300">
                                            <SelectValue placeholder="All statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {statuses.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600">Created from</Label>
                                    <Input
                                        type="date"
                                        className="h-9 w-[150px] border-slate-300"
                                        value={createdFrom}
                                        onChange={(e) => setCreatedFrom(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600">Created to</Label>
                                    <Input
                                        type="date"
                                        className="h-9 w-[150px] border-slate-300"
                                        value={createdTo}
                                        onChange={(e) => setCreatedTo(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-4xl">{title}</h1>
                            <p className="text-muted-foreground">{description}</p>
                        </div>

                        <div className="mt-8 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                            <div className="grid gap-4 md:grid-cols-6">
                            <div className="md:col-span-2 space-y-1">
                                <Label>Name</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {shouldShowAmount && (
                                <div className="space-y-1">
                                    <Label>Amount</Label>
                                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
                                </div>
                            )}
                            {shouldShowDate && (
                                <div className="space-y-1">
                                    <Label>Due date</Label>
                                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-1 md:col-span-2">
                                <Label>Details</Label>
                                <Input value={details} onChange={(e) => setDetails(e.target.value)} />
                            </div>
                            <div className="md:col-span-6">
                                <Button className={CRM_PRIMARY_BTN} onClick={handleCreate} disabled={isCreating}>
                                    Create
                                </Button>
                            </div>
                            </div>
                        </div>
                    </>
                )}

                <div
                    className={cn(
                        isProducts
                            ? "w-full min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm"
                            : "mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm",
                    )}
                >
                    <div className={isProducts ? "w-full min-w-0 overflow-x-auto" : undefined}>
                        <Table
                            className={cn(isProducts && "w-full min-w-[1400px] text-sm")}
                        >
                            <TableHeader
                                className={
                                    isProducts
                                        ? "border-b border-slate-200 bg-[#eaf0f6] [&_tr]:border-0"
                                        : undefined
                                }
                            >
                                <TableRow
                                    className={
                                        isProducts ? "border-0 hover:bg-transparent" : undefined
                                    }
                                >
                                    {isProducts ? (
                                        <>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Name
                                            </TableHead>
                                            <TableHead className="w-14 whitespace-nowrap px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Image
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                SKU
                                            </TableHead>
                                            <TableHead className="min-w-[140px] whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Description
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                URL
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Unit price
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Unit cost
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Margin
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Type
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Stock
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Created
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Status
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                Actions
                                            </TableHead>
                                        </>
                                    ) : (
                                        <>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Due</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody className={cn(isProducts && "[&_tr]:border-slate-100")}>
                                {items === undefined ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan={isProducts ? 14 : 6}
                                            className={cn(
                                                "text-center text-muted-foreground",
                                                isProducts && "py-16 text-sm",
                                            )}
                                        >
                                            Loading…
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan={isProducts ? 14 : 6}
                                            className={cn(
                                                "text-center text-muted-foreground",
                                                isProducts && "py-16 text-sm",
                                            )}
                                        >
                                            No items yet
                                        </TableCell>
                                    </TableRow>
                                ) : isProducts && items.length > 0 && filteredItems!.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan={14}
                                            className="text-muted-foreground py-16 text-center text-sm"
                                        >
                                            No products match your filters. Adjust status or clear filters.
                                        </TableCell>
                                    </TableRow>
                                ) : isProducts ? (
                                    filteredItems!.map((item, idx) => {
                                        const imageUrl = (item as { productImageUrl?: string | null })
                                            .productImageUrl;
                                        return (
                                        <TableRow
                                            key={item._id}
                                            className={cn(
                                                "h-10 border-b border-slate-100 transition-colors",
                                                idx % 2 === 1 && "bg-slate-50/40",
                                                "hover:bg-sky-50/40",
                                            )}
                                        >
                                            <TableCell className="max-w-[200px] px-3 py-1.5 align-middle font-medium text-slate-900">
                                                {item.title}
                                            </TableCell>
                                            <TableCell className="w-14 px-2 py-1.5 align-middle">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt=""
                                                        className="mx-auto size-10 rounded border border-slate-200 object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground flex justify-center text-xs">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[120px] truncate px-3 py-1.5 align-middle text-slate-800">
                                                {item.sku ?? "—"}
                                            </TableCell>
                                            <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm">
                                                {item.productDescription ?? "—"}
                                            </TableCell>
                                            <TableCell className="max-w-[140px]">
                                                {item.productUrl ? (
                                                    <a
                                                        href={item.productUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary underline-offset-4 hover:underline"
                                                    >
                                                        Link
                                                    </a>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatMoney(item.unitPrice)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatMoney(item.unitCost)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatMarginPercent(item.unitPrice, item.unitCost)}
                                            </TableCell>
                                            <TableCell>{productTypeLabel(item.productType)}</TableCell>
                                            <TableCell className="min-w-[9.5rem]">
                                                <ProductStockInput
                                                    itemId={item._id}
                                                    quantity={item.stockQuantity}
                                                    onCommit={handleStockCommit}
                                                    onAdjust={handleStockAdjust}
                                                />
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                                                {formatDateTime(item.createdAt)}
                                            </TableCell>
                                            <TableCell className="max-w-[220px]">
                                                <Select
                                                    value={item.status ?? (statuses[0] ?? "draft")}
                                                    onValueChange={(v) => handleStatusChange(item._id, v)}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statuses.map((s) => (
                                                            <SelectItem key={s} value={s}>
                                                                {s}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            openEditProduct(
                                                                item as Doc<"crmModuleItems"> & {
                                                                    productImageUrl?: string | null;
                                                                },
                                                            )
                                                        }
                                                        aria-label="Edit product"
                                                    >
                                                        <PencilIcon className="size-4 text-slate-700" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(item._id)}
                                                    >
                                                        <Trash2Icon className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })
                                ) : (
                                    items.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell className="font-medium">{item.title}</TableCell>
                                            <TableCell className="max-w-[220px]">
                                                <Select
                                                    value={item.status ?? (statuses[0] ?? "draft")}
                                                    onValueChange={(v) => handleStatusChange(item._id, v)}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statuses.map((s) => (
                                                            <SelectItem key={s} value={s}>
                                                                {s}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>{item.amount ?? "—"}</TableCell>
                                            <TableCell>{formatDate(item.dueAt)}</TableCell>
                                            <TableCell className="max-w-[260px] truncate">{item.details ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item._id)}
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

            {isProducts ? (
                <Dialog
                    open={productDialogOpen}
                    onOpenChange={(open) => {
                        setProductDialogOpen(open);
                        if (!open) resetProductForm();
                    }}
                >
                    <DialogContent className="max-h-[min(90vh,880px)] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingProductId ? "Edit product" : "Create product"}
                            </DialogTitle>
                        </DialogHeader>
                        {productFormFields}
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setProductDialogOpen(false);
                                    resetProductForm();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className={CRM_PRIMARY_BTN}
                                onClick={() => void handleSaveProduct()}
                                disabled={isCreating}
                            >
                                {isCreating
                                    ? editingProductId
                                        ? "Saving…"
                                        : "Creating…"
                                    : editingProductId
                                      ? "Save changes"
                                      : "Create product"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : null}
        </div>
    );
};

