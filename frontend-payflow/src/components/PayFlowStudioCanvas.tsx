"use client";
import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { AgStudio, createWidgets } from "ag-studio-react";
import { callPayFlow } from "@/lib/payflow";
import { withStatusFilter } from "@/lib/studio-state";
import { Sparkles, RefreshCw, RotateCcw } from "lucide-react";
import { AgStudioAiModule, createAiHarness, studioTheme, type AgLlmAdapter, } from "ag-studio";
export interface StudioOrderRow {
    id: string;
    quote_number: string;
    customer_name: string;
    customer_email: string;
    customer_company: string;
    subtotal_amount: number;
    discount_amount: number;
    total_amount: number;
    total_cost_amount: number;
    computed_margin_pct: number;
    status: string;
    settlement_label: string;
    requires_hitl: boolean;
    control_summary: string;
    created_at: string;
}
export interface StudioOrderItemRow {
    id: string;
    order_id: string;
    sku: string;
    product_name: string;
    quantity: number;
    applied_unit_price: number;
    discount_pct: number;
    line_total: number;
    line_margin_pct: number;
}
export interface StudioProductRow {
    sku: string;
    name: string;
    category: string;
    unit_price: number;
    unit_cost: number;
    stock_on_hand: number;
    stock_reserved: number;
    available_stock: number;
    max_discount_pct: number;
    min_margin_pct: number;
}
export interface StudioOperationRow {
    id: string;
    order_id: string;
    operation_type: string;
    paypal_request_id: string;
    status: string;
    http_status: number;
    attempt_count: number;
    paypal_resource_id: string;
}
export interface LlmProofMeta {
    llm_invoked: boolean;
    provider: string;
    model: string;
    n8n_node: string;
    raw_response_chars: number;
    executive_reasoning?: string | null;
    studio_command?: {
        recommended_view?: string;
        status_filter?: string;
        highlight_sku?: string | null;
        chart_focus?: string;
        assistant_reply?: string;
    } | null;
}
interface PayFlowStudioCanvasProps {
    orders: StudioOrderRow[];
    orderItems: StudioOrderItemRow[];
    products: StudioProductRow[];
    operations: StudioOperationRow[];
    summary: {
        total_orders: number;
        pending_hitl_count: number;
        approved_count: number;
        invoice_sent_count: number;
        paid_orders_count: number;
        paid_revenue_usd: number;
        simulated_test_paid_count: number;
        simulated_test_paid_usd: number;
        pipeline_revenue_usd: number;
        average_margin_pct: number;
    };
    onApplyStatusFilter?: (statusFilter: string) => void;
}
// React Error Boundary to ensure zero full-page crash
class StudioErrorBoundary extends Component<{
    children: React.ReactNode;
}, {
    hasError: boolean;
    errorMsg: string;
}> {
    constructor(props: {
        children: React.ReactNode;
    }) {
        super(props);
        this.state = { hasError: false, errorMsg: "" };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, errorMsg: error?.message || String(error) };
    }
    render() {
        if (this.state.hasError) {
            return (<div className="p-6 bg-slate-950 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-mono">
          AG Studio initialization error: {this.state.errorMsg}
        </div>);
        }
        return this.props.children;
    }
}
// Display formats are fixed to English; source values and aggregations are unchanged.
const studioNumbers = {
    integerFormat: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
    decimalFormat: new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    currencyFormat: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
};
// Custom AG Studio theme aligned with the PayFlow workspace
const payflowStudioTheme = studioTheme.withParams({
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontSize: 14,
    browserColorScheme: "light",
    accentColor: "#2457d6",
    menuBackgroundColor: "#f1f5fc",
    inputBackgroundColor: "#ffffff",
    inputTextColor: "#20344e",
    studioWrapperBackgroundColor: "#ffffff",
    studioPanelContainerBackgroundColor: "#ffffff",
    studioPanelGroupBackgroundColor: "#f1f5fc",
    gridHeaderBackgroundColor: "#f1f5fc",
    gridDataBackgroundColor: "#ffffff",
    gridOddRowBackgroundColor: "#f7f9fc",
    gridCellTextColor: "#20344e",
    gridHeaderTextColor: "#536984",
    gridBrowserColorScheme: "light",
    backgroundColor: "#ffffff",
    textColor: "#15243b",
    borderColor: "#e0e5ee",
    studioMinWidth: 300,
    studioMinHeight: 580,
    studioCanvasMinWidth: 280,
    studioCanvasBackgroundColor: "#f4f6fa",
    studioWidgetBackgroundColor: "#ffffff",
    studioWidgetBorder: { width: 1, color: "#e0e5ee" },
    studioWidgetBorderRadius: 10,
    studioWidgetPadding: 16,
    studioWidgetTitleFontFamily: "Inter, system-ui, sans-serif",
    studioWidgetTitleFontSize: 14,
    studioWidgetTitleFontWeight: "bold",
    studioWidgetTitleTextColor: "#15243b",
    studioWidgetSubtitleFontSize: 11,
    studioWidgetSubtitleTextColor: "#53647a",
    studioWidgetCaptionFontSize: 11,
    studioWidgetCaptionTextColor: "#65758a",
    studioToggleButtonActiveBackgroundColor: "#0070BA",
    studioToggleButtonActiveBorderColor: "#00A8EA",
    studioToggleButtonActiveColor: "#FFFFFF",
    studioValueWidgetFontSize: 24,
    gridRowHeight: 36,
    gridRowBorder: { width: 1, color: "#e0e5ee" },
    gridHeaderRowBorder: { width: 1, color: "#c7d3e2" },
    chartFontSize: 13,
    chartFontFamily: "Inter, system-ui, sans-serif",
    chartTextColor: "#20344e",
    chartSubtleTextColor: "#53647a",
    chartAxisLineColor: "#c7d3e2",
    chartGridLineColor: "#e0e5ee",
    chartPaletteFills1Color: "#0070BA",
    chartPaletteFills2Color: "#10B981",
    chartPaletteFills3Color: "#00A8EA",
    chartPaletteFills4Color: "#F59E0B",
    chartPaletteFills5Color: "#8B5CF6",
    chartPaletteFills6Color: "#EF4444",
    chartPaletteStrokes1Color: "#38BDF8",
    chartPaletteStrokes2Color: "#34D399",
    chartPaletteStrokes3Color: "#22D3EE",
    chartPaletteStrokes4Color: "#FBBF24",
    chartPaletteStrokes5Color: "#A78BFA",
    chartPaletteStrokes6Color: "#F87171",
});
// Custom React Widget registered inside AG Studio via createWidgets({ additionalTypes })
function PayFlowHitlGuardCustomWidget() {
    return <div className="guard-widget"><strong>Read the numbers with confidence</strong>Order volumes include simulations. Only confirmed PayPal captures count as receipts in Overview.</div>;
}
// Register our custom widget alongside AG Studio's built-in widgets
const payflowStudioWidgets = createWidgets<any>({
    additionalTypes: [
        {
            id: "payflow-hitl-guard",
            label: "Understanding receipts",
            defaultSize: { width: 420, height: 160 },
            minSize: { width: 280, height: 120 },
            form: (params: any) => params.createDefaults({}),
            comp: PayFlowHitlGuardCustomWidget,
            ai: {
                label: "Understanding receipts",
                description: "Custom widget displaying PayFlow AI deterministic financial guardrails, atomic PostgreSQL HITL token protection, and PayPal Sandbox settlement verification.",
            },
        },
    ],
});
export default function PayFlowStudioCanvas({ orders, orderItems, products, operations, onApplyStatusFilter, }: PayFlowStudioCanvasProps) {
    const studioRef = useRef<any>(null);
    const [narrowLayout, setNarrowLayout] = useState(false);
    const statusCount = new Set(orders.map(order => order.settlement_label)).size;
    const filterExtra = filterExtraTracks(narrowLayout, statusCount);
    useEffect(() => {
        const media = window.matchMedia("(max-width: 1050px)");
        const update = () => setNarrowLayout(media.matches);
        update(); media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);
    const [studioMode, setStudioMode] = useState<"view" | "edit">("view");
    const [agentPrompt, setAgentPrompt] = useState("Analyse margins and filter orders awaiting internal approval. Please reply in English.");
    const [agentBusy, setAgentBusy] = useState(false);
    const [lastAgentReply, setLastAgentReply] = useState<string | null>(null);
    const [lastLlmProof, setLastLlmProof] = useState<LlmProofMeta | null>(null);
    const [agentError, setAgentError] = useState(false);
    // Multi-table Relational Data Engine for AG Studio 3 (AgDataRelationDefinition format)
    const studioData = useMemo(() => ({
        description: "PayFlow AI B2B Financial Ledger: multi-table relational dataset joining orders, order_items, products catalog, and PayPal Sandbox idempotent payment operations.",
        sources: [
            {
                id: "orders",
                name: "Orders & quotes",
                description: "B2B orders, net margins, internal review and PayPal settlement statuses.",
                data: orders,
                fields: [
                    { id: "id", name: "Order ID", format: "textFormat" as const },
                    {
                        id: "quote_number",
                        name: "Quote number",
                        format: "textFormat" as const,
                    },
                    {
                        id: "customer_company",
                        name: "Customer company",
                        format: "textFormat" as const,
                    },
                    {
                        id: "customer_name",
                        name: "Buyer contact",
                        format: "textFormat" as const,
                    },
                    {
                        id: "settlement_label",
                        name: "Status & settlement",
                        format: "textFormat" as const,
                    },
                    {
                        id: "status",
                        name: "Raw status code",
                        format: "textFormat" as const,
                    },
                    {
                        id: "subtotal_amount",
                        name: "Catalogue subtotal ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "discount_amount",
                        name: "Discount amount ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "total_amount",
                        name: "Net total amount ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "total_cost_amount",
                        name: "Total cost ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "computed_margin_pct",
                        name: "Net margin (%)",
                        format: "decimalFormat" as const, formatOptions: { format: studioNumbers.decimalFormat },
                    },
                    {
                        id: "control_summary",
                        name: "Checks & issues",
                        format: "textFormat" as const,
                    },
                ],
            },
            {
                id: "order_items",
                name: "Order lines (payflow_order_items)",
                description: "B2B order lines with discounted prices and line margins.",
                data: orderItems,
                fields: [
                    {
                        id: "order_id",
                        name: "Order ID",
                        format: "textFormat" as const,
                    },
                    { id: "sku", name: "Product SKU", format: "textFormat" as const },
                    {
                        id: "product_name",
                        name: "Product name",
                        format: "textFormat" as const,
                    },
                    {
                        id: "quantity",
                        name: "Quantity (cases)",
                        format: "integerFormat" as const, formatOptions: { format: studioNumbers.integerFormat },
                    },
                    {
                        id: "applied_unit_price",
                        name: "Applied unit price ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "discount_pct",
                        name: "Line discount (%)",
                        format: "decimalFormat" as const, formatOptions: { format: studioNumbers.decimalFormat },
                    },
                    {
                        id: "line_total",
                        name: "Line total ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "line_margin_pct",
                        name: "Line margin (%)",
                        format: "decimalFormat" as const, formatOptions: { format: studioNumbers.decimalFormat },
                    },
                ],
            },
            {
                id: "products",
                name: "Catalogue & stock (payflow_products)",
                description: "Product catalogue with on-hand stock, reserved stock and margin thresholds.",
                data: products,
                fields: [
                    { id: "sku", name: "Product SKU", format: "textFormat" as const },
                    { id: "name", name: "Product name", format: "textFormat" as const },
                    {
                        id: "category",
                        name: "Category",
                        format: "textFormat" as const,
                    },
                    {
                        id: "unit_price",
                        name: "Catalogue price ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "unit_cost",
                        name: "Unit cost ($)",
                        format: "currencyFormat" as const, formatOptions: { format: studioNumbers.currencyFormat },
                    },
                    {
                        id: "stock_on_hand",
                        name: "On-hand stock",
                        format: "integerFormat" as const, formatOptions: { format: studioNumbers.integerFormat },
                    },
                    {
                        id: "stock_reserved",
                        name: "Reserved stock",
                        format: "integerFormat" as const, formatOptions: { format: studioNumbers.integerFormat },
                    },
                    {
                        id: "available_stock",
                        name: "Available stock",
                        format: "integerFormat" as const, formatOptions: { format: studioNumbers.integerFormat },
                    },
                ],
            },
            {
                id: "payment_operations",
                name: "PayPal operations",
                description: "PayPal Sandbox API idempotency log (PayPal-Request-Id).",
                data: operations,
                fields: [
                    {
                        id: "id",
                        name: "Operation ID",
                        format: "textFormat" as const,
                    },
                    {
                        id: "order_id",
                        name: "Order ID",
                        format: "textFormat" as const,
                    },
                    {
                        id: "operation_type",
                        name: "PayPal API type",
                        format: "textFormat" as const,
                    },
                    {
                        id: "status",
                        name: "Operation status",
                        format: "textFormat" as const,
                    },
                    {
                        id: "attempt_count",
                        name: "Attempt count",
                        format: "integerFormat" as const, formatOptions: { format: studioNumbers.integerFormat },
                    },
                ],
            },
        ],
        relationships: [
            {
                id: "rel_orders_items",
                source: { tableId: "orders", fieldId: "id" },
                target: { tableId: "order_items", fieldId: "order_id" },
                type: "one-to-many" as const,
            },
            {
                id: "rel_products_items",
                source: { tableId: "products", fieldId: "sku" },
                target: { tableId: "order_items", fieldId: "sku" },
                type: "one-to-many" as const,
            },
            {
                id: "rel_orders_ops",
                source: { tableId: "orders", fieldId: "id" },
                target: { tableId: "payment_operations", fieldId: "order_id" },
                type: "one-to-many" as const,
            },
        ],
    }), [orders, orderItems, products, operations]);
    // Initial Dashboard State inside <AgStudio /> (xTrack / yTrack layout coordinates)
    const initialState = useMemo(() => ({
        selectedPageId: "payflow-executive-studio",
        panels: { filters: { collapsed: true } },
        pages: [
            {
                id: "payflow-executive-studio",
                widgets: {
                    "filter-settlement": {
                        type: "button-filter",
                        format: {
                            title: {
                                text: "Filter by status",
                                enabled: true,
                            },
                            style: {
                                selection: { type: "multiple" },
                                dimensions: { minWidth: 180, height: 40 },
                                defaultItem: {
                                    backgroundColor: "#f1f5fc",
                                    color: "#304664",
                                    borderEnabled: true,
                                    borderColor: "#c7d3e2",
                                    borderRadius: 6,
                                },
                                activeItem: {
                                    backgroundColor: "#0070BA",
                                    color: "#FFFFFF",
                                    borderColor: "#38BDF8",
                                },
                            },
                        },
                        dataMapping: {
                            value: [{ id: "orders.settlement_label" }],
                        },
                    },
                    "kpi-portfolio-volume": {
                        type: "value",
                        format: {
                            title: {
                                text: "Order volume (USD)",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Includes simulations",
                                enabled: true,
                            },
                            crossFilter: "filter",
                            style: {
                                color: "#2457d6",
                                typography: { fontSize: 26, fontWeight: "bold" },
                                sparkline: { type: "bar", areaFill: true },
                            },
                        },
                        dataMapping: {
                            value: [{ id: "orders.total_amount", aggregation: "sum" }],
                            sparklineX: [{ id: "orders.quote_number" }],
                        },
                    },
                    "kpi-margin-avg": {
                        type: "value",
                        format: {
                            title: { text: "Average margin (%)", enabled: true },
                            subtitle: {
                                text: "Filtered orders",
                                enabled: true,
                            },
                            crossFilter: "filter",
                            style: {
                                color: "#12664f",
                                typography: { fontSize: 26, fontWeight: "bold" },
                            },
                        },
                        dataMapping: {
                            value: [
                                { id: "orders.computed_margin_pct", aggregation: "avg" },
                            ],
                        },
                    },
                    "custom-guard-widget": {
                        type: "payflow-hitl-guard",
                        dataMapping: {},
                    },
                    "chart-company-revenue": {
                        type: "bar-chart-grouped",
                        format: {
                            title: {
                                text: "Orders & cost by customer",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Click a bar to explore this customer",
                                enabled: true,
                            },
                            crossFilter: "filter",
                            style: { theme: { common: { legend: { enabled: true, position: "top-left" } } }, custom: { categoryAxis: { label: { fontSize: 12 } } } },
                        },
                        dataMapping: {
                            categoryKey: [{ id: "orders.customer_company" }],
                            valueKey: [
                                { id: "orders.total_amount", aggregation: "sum" },
                                { id: "orders.total_cost_amount", aggregation: "sum" },
                            ],
                        },
                    },
                    "chart-settlement-donut": {
                        type: "donut-chart",
                        format: {
                            title: {
                                text: "Order breakdown",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Captures and simulations identified separately",
                                enabled: true,
                            },
                            crossFilter: "filter",
                            style: { theme: { common: { legend: { enabled: true, position: "right" } } } },
                        },
                        dataMapping: {
                            categoryKey: [{ id: "orders.settlement_label" }],
                            valueKey: [{ id: "orders.total_amount", aggregation: "sum" }],
                        },
                    },
                    "chart-sku-demand": {
                        type: "bar-chart-grouped",
                        format: {
                            title: {
                                text: "Order amount by product",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Order line data",
                                enabled: true,
                            },
                            crossFilter: "filter",
                            style: { theme: { common: { legend: { enabled: false } } }, custom: { categoryAxis: { label: { fontSize: 12 } } } },
                        },
                        dataMapping: {
                            categoryKey: [{ id: "order_items.product_name" }],
                            valueKey: [{ id: "order_items.line_total", aggregation: "sum" }],
                        },
                    },
                    "grid-studio-orders": {
                        type: "grid",
                        format: {
                            title: {
                                text: "Filtered order details",
                                enabled: true,
                            },
                            crossFilter: "filter",
                            style: { columnAutoSize: false, columnWidth: 320, headerRow: { wrapText: true } },
                        },
                        dataMapping: {
                            cols: [
                                { id: "orders.quote_number" },
                                { id: "orders.customer_company" },
                                { id: "orders.settlement_label" },
                                { id: "orders.total_amount", aggregation: "sum" },
                                { id: "orders.computed_margin_pct", aggregation: "avg" },
                                { id: "orders.control_summary" },
                            ],
                        },
                    },
                },
                widgetLayout: dashboardLayout(narrowLayout, statusCount),
            },
        ],
    }), [narrowLayout, statusCount]);
    useEffect(() => {
        const api = studioRef.current?.api;
        if (!api) return;
        const state = api.getState();
        api.setState({ ...state, pages: state.pages.map((page: any) => page.id === "payflow-executive-studio" ? { ...page, widgetLayout: { ...page.widgetLayout, ...dashboardLayout(narrowLayout, statusCount) } } : page) });
    }, [narrowLayout, statusCount]);
    function applyAgentFilter(rawStatus: string) {
        const api = studioRef.current?.api;
        if (!api)
            return;
        const state = withStatusFilter(api.getState(), rawStatus);
        if (!state)
            return;
        api.setState(state);
        onApplyStatusFilter?.(rawStatus === "PENDING_HITL" ? "PENDING_APPROVAL" : rawStatus);
    }
    async function askAgent(prompt: string) {
        setAgentError(false);
        const { data } = await callPayFlow({ action: "ai_studio_agent", prompt });
        if (!data.llm_proof?.llm_invoked)
            throw new Error("Gemini did not produce an analysis. Check the PayFlow engine's AI connection in Administration / Audit.");
        if (data.status !== "success" || !data.assistant_reply)
            throw new Error("The agent did not return an analysis. Please try again.");
        setLastLlmProof(data.llm_proof || null);
        setLastAgentReply(data.assistant_reply);
        if (data.studio_command?.status_filter)
            applyAgentFilter(data.studio_command.status_filter);
        return { reply: data.assistant_reply, model: data.llm_proof?.model || "Gemini" };
    }
    // Official Studio Agent Framework, using the existing Gemini gateway.
    const payflowGeminiStudioAdapter: AgLlmAdapter = useMemo(() => ({
        executeTurn(request) {
            let prompt = "Analyse the PayFlow AI portfolio. Please reply in English.";
            for (let i = request.input.length - 1; i >= 0; i--) {
                const item: any = request.input[i];
                if (item?.role === "user" && Array.isArray(item.content)) {
                    const part = item.content.find((c: any) => c.type === "input_text" || typeof c.text === "string");
                    if (part?.text) {
                        prompt = part.text;
                        break;
                    }
                }
            }
            const messageId = `msg_${Date.now()}`;
            let resolveComplete!: (value: any) => void;
            const complete = new Promise<any>(resolve => { resolveComplete = resolve; });
            async function* streamGenerator(): AsyncGenerator<any> {
                let reply = "", model = "Gemini", failed = false;
                try {
                    const answer = await askAgent(prompt);
                    reply = answer.reply;
                    model = answer.model;
                }
                catch (e) {
                    failed = true;
                    reply = e instanceof Error ? e.message : "The agent is unavailable.";
                    setAgentError(true);
                    setLastAgentReply(reply);
                }
                yield { type: "TEXT_MESSAGE_CHUNK", messageId, delta: reply };
                resolveComplete({ id: `resp_${Date.now()}`, createdAt: Date.now(), status: failed ? "failed" : "completed", model, output: [{ id: messageId, kind: "output", type: "message", role: "assistant", status: failed ? "failed" : "completed", content: [{ type: "output_text", text: reply }] }] });
            }
            return { stream: streamGenerator(), complete };
        },
    }), [onApplyStatusFilter]);
    async function runDirectStudioAgentPrompt(customPrompt?: string) {
        const text = (customPrompt ?? agentPrompt).trim();
        if (!text || agentBusy)
            return;
        setAgentBusy(true);
        setLastAgentReply(null);
        setLastLlmProof(null);
        try {
            await askAgent(text);
        }
        catch (e) {
            setAgentError(true);
            setLastAgentReply(e instanceof Error ? e.message : "The agent is unavailable.");
        }
        finally {
            setAgentBusy(false);
        }
    }
    return <div>
    <section className="panel studio-agent">
      <div className="panel-heading"><div className="assistant-title"><span className="assistant-icon"><Sparkles size={20}/></span><div><h2>Ask your data a question.</h2><p>Gemini helps you review margins and find orders that need attention.</p></div></div><span className="ai-label">GEMINI</span></div>
      <form onSubmit={e => { e.preventDefault(); void runDirectStudioAgentPrompt(); }}><input aria-label="Question for the financial analyst" value={agentPrompt} maxLength={6000} onChange={e => setAgentPrompt(e.target.value)} placeholder="Which orders await my internal approval?" required disabled={agentBusy}/><button className="button primary" disabled={agentBusy || !agentPrompt.trim()}>{agentBusy ? <><RefreshCw size={16} className="spin"/>Analysing…</> : <>Analyse <Sparkles size={16}/></>}</button></form>
      <div className="studio-prompts">{[
            ["Orders to review", "Filter orders awaiting internal approval. Please reply in English."],
            ["Awaiting payment", "Filter issued PayPal orders awaiting payment. Please reply in English."],
            ["Margin analysis", "Analyse order margins and show all orders. Please reply in English."],
        ].map(([label, prompt]) => <button key={label} disabled={agentBusy} onClick={() => { setAgentPrompt(prompt); void runDirectStudioAgentPrompt(prompt); }}>{label}</button>)}</div>
      {lastAgentReply && <div className={`studio-reply ${agentError ? "error" : ""}`} role={agentError ? "alert" : "status"}>{lastAgentReply}{lastLlmProof?.llm_invoked && <details className="technical-details"><summary>Analysis source</summary>{lastLlmProof.provider} · {lastLlmProof.model}</details>}</div>}
    </section>
    <div className="studio-controls"><p>AG Studio · Select a customer or status in the charts to explore related orders.</p><div><button className="button secondary" onClick={() => applyAgentFilter("ALL")}><RotateCcw size={14}/>Reset filters</button><button className="button secondary" onClick={() => setStudioMode(mode => mode === "view" ? "edit" : "view")}>{studioMode === "view" ? "Customize dashboard" : "Finish customizing"}</button></div></div>
    {orders.length === 0 && <div className="notice warning" role="status"><span>No orders available. Charts will populate with your first quotes.</span></div>}
    <StudioErrorBoundary><div className="studio-scroll"><div id="ag-studio-live-container" className="studio-canvas" style={{ height: (narrowLayout ? 2320 : 1280) + filterExtra * 16 }}>
      <AgStudio ref={studioRef} modules={[AgStudioAiModule]} theme={payflowStudioTheme} mode={studioMode} widgets={payflowStudioWidgets} data={studioData as any} initialState={initialState as any} ai={({ api }) => createAiHarness(api, { adapter: payflowGeminiStudioAdapter })} style={{ width: "100%", height: "100%" }}/>
    </div></div></StudioErrorBoundary><p className="studio-help">Order volume is not a receipt. Select a chart or status to explore the related orders.</p>
  </div>;
}

// Responsive native layout only; widget data, relations and filters are preserved.
function filterExtraTracks(narrow: boolean, statuses: number) {
    return Math.max(0, narrow ? statuses * 3 + 8 - 18 : Math.ceil(statuses / 3) * 3 + 6 - 12);
}
function dashboardLayout(narrow: boolean, statuses: number) {
    const layout = narrow ? {
        "filter-settlement": { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 18 },
        "kpi-portfolio-volume": { xTrack: 0, yTrack: 18, xSpan: 24, ySpan: 10 },
        "kpi-margin-avg": { xTrack: 0, yTrack: 28, xSpan: 24, ySpan: 10 },
        "custom-guard-widget": { xTrack: 0, yTrack: 38, xSpan: 24, ySpan: 12 },
        "chart-company-revenue": { xTrack: 0, yTrack: 50, xSpan: 24, ySpan: 28 },
        "chart-settlement-donut": { xTrack: 0, yTrack: 78, xSpan: 24, ySpan: 24 },
        "chart-sku-demand": { xTrack: 0, yTrack: 102, xSpan: 24, ySpan: 22 },
        "grid-studio-orders": { xTrack: 0, yTrack: 124, xSpan: 24, ySpan: 26 },
    } : {
        "filter-settlement": { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 12 },
        "kpi-portfolio-volume": { xTrack: 0, yTrack: 12, xSpan: 8, ySpan: 12 },
        "kpi-margin-avg": { xTrack: 8, yTrack: 12, xSpan: 8, ySpan: 12 },
        "custom-guard-widget": { xTrack: 16, yTrack: 12, xSpan: 8, ySpan: 12 },
        "chart-company-revenue": { xTrack: 0, yTrack: 24, xSpan: 12, ySpan: 26 },
        "chart-settlement-donut": { xTrack: 12, yTrack: 24, xSpan: 12, ySpan: 26 },
        "chart-sku-demand": { xTrack: 0, yTrack: 50, xSpan: 12, ySpan: 26 },
        "grid-studio-orders": { xTrack: 12, yTrack: 50, xSpan: 12, ySpan: 26 },
    };
    const extra = filterExtraTracks(narrow, statuses);
    return Object.fromEntries(Object.entries(layout).map(([id, position]) => [id, { ...position, yTrack: position.yTrack + (id === "filter-settlement" ? 0 : extra), ySpan: position.ySpan + (id === "filter-settlement" ? extra : 0) }]));
}
