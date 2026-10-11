"use client";
import React, { Component, useMemo, useRef, useState } from "react";
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
          Erreur d&apos;initialisation AG Studio : {this.state.errorMsg}
        </div>);
        }
        return this.props.children;
    }
}
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
    studioMinWidth: 850,
    studioMinHeight: 580,
    studioCanvasMinWidth: 1000,
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
    return <div className="guard-widget"><strong>Lire les chiffres avec confiance</strong>Les volumes de commandes incluent les simulations. Seules les captures PayPal confirmées sont comptées comme encaissements en vue d’ensemble.</div>;
}
// Register our custom widget alongside AG Studio's built-in widgets
const payflowStudioWidgets = createWidgets<any>({
    additionalTypes: [
        {
            id: "payflow-hitl-guard",
            label: "Lecture des encaissements",
            defaultSize: { width: 420, height: 160 },
            minSize: { width: 280, height: 120 },
            form: (params: any) => params.createDefaults({}),
            comp: PayFlowHitlGuardCustomWidget,
            ai: {
                label: "Lecture des encaissements",
                description: "Custom widget displaying PayFlow AI deterministic financial guardrails, atomic PostgreSQL HITL token protection, and PayPal Sandbox settlement verification.",
            },
        },
    ],
});
export default function PayFlowStudioCanvas({ orders, orderItems, products, operations, onApplyStatusFilter, }: PayFlowStudioCanvasProps) {
    const studioRef = useRef<any>(null);
    const [studioMode, setStudioMode] = useState<"view" | "edit">("view");
    const [agentPrompt, setAgentPrompt] = useState("Analyse les marges et filtre les commandes en attente d’approbation.");
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
                name: "Commandes & devis",
                description: "En-têtes des commandes B2B, marges nettes, statuts HITL et états de règlement PayPal.",
                data: orders,
                fields: [
                    { id: "id", name: "ID Commande", format: "textFormat" as const },
                    {
                        id: "quote_number",
                        name: "N° Devis",
                        format: "textFormat" as const,
                    },
                    {
                        id: "customer_company",
                        name: "Entreprise Cliente",
                        format: "textFormat" as const,
                    },
                    {
                        id: "customer_name",
                        name: "Contact Acheteur",
                        format: "textFormat" as const,
                    },
                    {
                        id: "settlement_label",
                        name: "Statut & Règlement",
                        format: "textFormat" as const,
                    },
                    {
                        id: "status",
                        name: "Code Statut Brut",
                        format: "textFormat" as const,
                    },
                    {
                        id: "subtotal_amount",
                        name: "Sous-total Catalogue ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "discount_amount",
                        name: "Remise Accordée ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "total_amount",
                        name: "Montant Total Net ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "total_cost_amount",
                        name: "Coût de Revient ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "computed_margin_pct",
                        name: "Marge Nette (%)",
                        format: "decimalFormat" as const,
                    },
                    {
                        id: "control_summary",
                        name: "Contrôles & Anomalies",
                        format: "textFormat" as const,
                    },
                ],
            },
            {
                id: "order_items",
                name: "Lignes d'Articles (payflow_order_items)",
                description: "Détail des lignes d'articles par commande B2B avec prix remisés et marges par ligne.",
                data: orderItems,
                fields: [
                    {
                        id: "order_id",
                        name: "ID Commande",
                        format: "textFormat" as const,
                    },
                    { id: "sku", name: "SKU Produit", format: "textFormat" as const },
                    {
                        id: "product_name",
                        name: "Nom Cuvée / Produit",
                        format: "textFormat" as const,
                    },
                    {
                        id: "quantity",
                        name: "Quantité (Caisses)",
                        format: "integerFormat" as const,
                    },
                    {
                        id: "applied_unit_price",
                        name: "Prix Unitaire Appliqué ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "discount_pct",
                        name: "Remise Ligne (%)",
                        format: "decimalFormat" as const,
                    },
                    {
                        id: "line_total",
                        name: "Total Ligne ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "line_margin_pct",
                        name: "Marge Ligne (%)",
                        format: "decimalFormat" as const,
                    },
                ],
            },
            {
                id: "products",
                name: "Catalogue & Stocks (payflow_products)",
                description: "Référentiel produits Vinistoria avec stock physique, stock réservé et seuils de marge.",
                data: products,
                fields: [
                    { id: "sku", name: "SKU Produit", format: "textFormat" as const },
                    { id: "name", name: "Nom Cuvée", format: "textFormat" as const },
                    {
                        id: "category",
                        name: "Catégorie",
                        format: "textFormat" as const,
                    },
                    {
                        id: "unit_price",
                        name: "Prix Catalogue ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "unit_cost",
                        name: "Coût Unitaire ($)",
                        format: "currencyFormat" as const,
                    },
                    {
                        id: "stock_on_hand",
                        name: "Stock Physique",
                        format: "integerFormat" as const,
                    },
                    {
                        id: "stock_reserved",
                        name: "Stock Réservé",
                        format: "integerFormat" as const,
                    },
                    {
                        id: "available_stock",
                        name: "Stock Disponible",
                        format: "integerFormat" as const,
                    },
                ],
            },
            {
                id: "payment_operations",
                name: "Opérations PayPal",
                description: "Journal d'idempotence des appels API PayPal Sandbox (PayPal-Request-Id).",
                data: operations,
                fields: [
                    {
                        id: "id",
                        name: "ID Opération",
                        format: "textFormat" as const,
                    },
                    {
                        id: "order_id",
                        name: "ID Commande",
                        format: "textFormat" as const,
                    },
                    {
                        id: "operation_type",
                        name: "Type API PayPal",
                        format: "textFormat" as const,
                    },
                    {
                        id: "status",
                        name: "Statut Opération",
                        format: "textFormat" as const,
                    },
                    {
                        id: "attempt_count",
                        name: "Nb Tentatives",
                        format: "integerFormat" as const,
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
                                text: "Filtrer par statut",
                                enabled: true,
                            },
                            style: {
                                selection: { type: "multiple" },
                                dimensions: { minWidth: 215, height: 40 },
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
                                text: "Volume commandé (USD)",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Inclut les simulations",
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
                            title: { text: "Marge moyenne (%)", enabled: true },
                            subtitle: {
                                text: "Commandes filtrées",
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
                                text: "Commandes & coût par client",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Cliquez sur une barre pour explorer ce client",
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
                                text: "Répartition des commandes",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Captures et simulations identifiées séparément",
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
                                text: "Montant commandé par produit",
                                enabled: true,
                            },
                            subtitle: {
                                text: "Données des lignes de commande",
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
                                text: "Détail des commandes filtrées",
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
                widgetLayout: {
                    "filter-settlement": { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 12 },
                    "kpi-portfolio-volume": { xTrack: 0, yTrack: 12, xSpan: 9, ySpan: 12 },
                    "kpi-margin-avg": { xTrack: 9, yTrack: 12, xSpan: 7, ySpan: 12 },
                    "custom-guard-widget": { xTrack: 16, yTrack: 12, xSpan: 8, ySpan: 12 },
                    "chart-company-revenue": { xTrack: 0, yTrack: 24, xSpan: 24, ySpan: 30 },
                    "chart-sku-demand": { xTrack: 0, yTrack: 54, xSpan: 24, ySpan: 22 },
                    "chart-settlement-donut": { xTrack: 0, yTrack: 76, xSpan: 24, ySpan: 22 },
                    "grid-studio-orders": { xTrack: 0, yTrack: 98, xSpan: 24, ySpan: 26 },
                },
            },
        ],
    }), []);
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
            throw new Error("Gemini n’a pas produit d’analyse. Vérifiez la connexion IA du moteur PayFlow dans Administration / Audit.");
        if (data.status !== "success" || !data.assistant_reply)
            throw new Error("L’agent n’a pas retourné d’analyse. Réessayez.");
        setLastLlmProof(data.llm_proof || null);
        setLastAgentReply(data.assistant_reply);
        if (data.studio_command?.status_filter)
            applyAgentFilter(data.studio_command.status_filter);
        return { reply: data.assistant_reply, model: data.llm_proof?.model || "Gemini" };
    }
    // Official Studio Agent Framework, using the existing Gemini gateway.
    const payflowGeminiStudioAdapter: AgLlmAdapter = useMemo(() => ({
        executeTurn(request) {
            let prompt = "Analyse le portefeuille PayFlow AI.";
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
                    reply = e instanceof Error ? e.message : "L’agent est indisponible.";
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
            setLastAgentReply(e instanceof Error ? e.message : "L’agent est indisponible.");
        }
        finally {
            setAgentBusy(false);
        }
    }
    return <div>
    <section className="panel studio-agent">
      <div className="panel-heading"><div className="assistant-title"><span className="assistant-icon"><Sparkles size={20}/></span><div><h2>Interrogez vos données.</h2><p>Gemini vous aide à examiner les marges et à retrouver les commandes à traiter.</p></div></div><span className="ai-label">GEMINI</span></div>
      <form onSubmit={e => { e.preventDefault(); void runDirectStudioAgentPrompt(); }}><input aria-label="Question à l’analyste financier" value={agentPrompt} maxLength={6000} onChange={e => setAgentPrompt(e.target.value)} placeholder="Quelles commandes attendent mon approbation ?" required disabled={agentBusy}/><button className="button primary" disabled={agentBusy || !agentPrompt.trim()}>{agentBusy ? <><RefreshCw size={16} className="spin"/>Analyse en cours…</> : <>Analyser <Sparkles size={16}/></>}</button></form>
      <div className="studio-prompts">{[
            ["Commandes à approuver", "Filtre les commandes en attente d’approbation."],
            ["Paiements attendus", "Filtre les commandes PayPal émises en attente de paiement."],
            ["Analyse des marges", "Analyse les marges des commandes et affiche toutes les commandes."],
        ].map(([label, prompt]) => <button key={label} disabled={agentBusy} onClick={() => { setAgentPrompt(prompt); void runDirectStudioAgentPrompt(prompt); }}>{label}</button>)}</div>
      {lastAgentReply && <div className={`studio-reply ${agentError ? "error" : ""}`} role={agentError ? "alert" : "status"}>{lastAgentReply}{lastLlmProof?.llm_invoked && <details className="technical-details"><summary>Source de l’analyse</summary>{lastLlmProof.provider} · {lastLlmProof.model}</details>}</div>}
    </section>
    <div className="studio-controls"><p>AG Studio · Sélectionnez un client ou un statut dans les graphiques pour explorer ses commandes.</p><div><button className="button secondary" onClick={() => applyAgentFilter("ALL")}><RotateCcw size={14}/>Réinitialiser les filtres</button><button className="button secondary" onClick={() => setStudioMode(mode => mode === "view" ? "edit" : "view")}>{studioMode === "view" ? "Personnaliser le tableau de bord" : "Terminer la personnalisation"}</button></div></div>
    {orders.length === 0 && <div className="notice warning" role="status"><span>Aucune commande disponible. Les graphiques se rempliront avec vos premiers devis.</span></div>}
    <StudioErrorBoundary><div className="studio-scroll"><div id="ag-studio-live-container" className="studio-canvas">
      <AgStudio ref={studioRef} modules={[AgStudioAiModule]} theme={payflowStudioTheme} mode={studioMode} widgets={payflowStudioWidgets} data={studioData as any} initialState={initialState as any} ai={({ api }) => createAiHarness(api, { adapter: payflowGeminiStudioAdapter })} style={{ width: "100%", height: "100%" }}/>
    </div></div></StudioErrorBoundary><p className="studio-help">Le volume des commandes n’est pas un encaissement. Sur mobile, faites défiler horizontalement le tableau de bord pour explorer les graphiques.</p>
  </div>;
}
