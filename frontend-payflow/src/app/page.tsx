"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ArrowDownLeft, ArrowUpRight, ArrowRight, BarChart3, Check, CheckCircle2, ChevronRight, Clock3, Download, FileText, LayoutDashboard, LockKeyhole, Package, RefreshCw, Search, ShieldCheck, Sparkles, Wallet, X, AlertTriangle } from "lucide-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { callPayFlow, money, isCaptured, isSimulated, settlementLabel, type OrderRow, type ProductRow, type OperationRow } from "@/lib/payflow";
import { nextOrderStep, orderJourney } from "@/lib/experience";
import { explainControl } from "@/lib/control-explanations";
import { displayMessage } from "@/lib/display-message";
import type { StudioOrderRow, StudioOrderItemRow, StudioProductRow, StudioOperationRow } from "@/components/PayFlowStudioCanvas";
const Studio = dynamic(() => import("@/components/PayFlowStudioCanvas"), { ssr: false, loading: () => <div className="empty-state loading-state"><RefreshCw className="spin"/><h3>Preparing your analytics…</h3><p>Loading your interactive dashboard.</p></div> });
type Space = "overview" | "orders" | "studio" | "catalog" | "audit";
const navigation = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: FileText },
    { id: "studio", label: "AI analytics", icon: BarChart3 },
    { id: "catalog", label: "Catalogue", icon: Package },
] as const;
const titles = { overview: ["Your sales, from quote to payment.", "Prepare a quote with Gemini. Review the checks. Track the PayPal payment."], orders: ["Every order has a next step.", "Find quotes to review, outstanding payments and confirmed receipts."], studio: ["Understand what moves your sales forward.", "Ask Gemini a question and explore the results in AG Studio."], catalog: ["Your catalogue, ready to sell.", "Prices, availability and margins: the data behind every checked quote."], audit: ["Administration / Audit", "Operation history and technical diagnostics."] };
const filters = [{ id: "ALL", label: "All" }, { id: "PENDING_APPROVAL", label: "Needs review" }, { id: "APPROVED", label: "Internally approved" }, { id: "AWAITING_PAYMENT", label: "Awaiting payment" }, { id: "INVOICE_SENT", label: "Links issued" }, { id: "CAPTURED", label: "Paid" }, { id: "SIMULATED", label: "Simulations" }, { id: "BLOCKED_OR_REJECTED", label: "Closed / blocked" }];
const presets = [
    { label: "Standard quote", prompt: "Order: 1 case of Château Margaux Grand Cru 2018 and 1 case of Champagne Brut with a 5% discount. Please reply in English." },
    { label: "Discount to review", prompt: "Order: 3 cases of Château Margaux Grand Cru 2018 with an 18% discount. Please reply in English." },
    { label: "Stock check", prompt: "Order: 95 cases of Rhum Vieux XO. Please reply in English." },
];

function Status({ order }: {
    order: OrderRow;
}) {
    const tone = isSimulated(order) ? "neutral" : isCaptured(order) ? "positive" : ["PENDING_APPROVAL", "BLOCKED_ANOMALY"].includes(order.status) ? "warning" : ["REJECTED","CANCELLED","OVERDUE"].includes(order.status) ? "neutral" : "blue";
    return <span className={`status ${tone}`}><span />{settlementLabel(order)}</span>;
}
function Empty({ title, detail }: {
    title: string;
    detail: string;
}) { return <div className="empty-state"><FileText /><h3>{title}</h3><p>{detail}</p></div>; }
export default function PayFlowPage() {
    const [operator, setOperator] = useState<string | null>(null);
    const [loginOpen, setLoginOpen] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [loginBusy, setLoginBusy] = useState(false);
    const loginRef = useRef<HTMLDialogElement>(null);
    const financialActionsEnabled = !!operator;
    const login = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); if(loginBusy) return;
        const form = new FormData(event.currentTarget); setLoginBusy(true); setLoginError("");
        try {
            const response = await fetch("/api/operator", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.get("username"),password:form.get("password")})});
            const data = await response.json();
            if(!response.ok) throw new Error(displayMessage(data.message, "Sign-in rejected."));
            setOperator(data.user.username); setLoginOpen(false); void refresh();
        } catch(e) { setLoginError(e instanceof Error ? e.message : "Sign-in unavailable."); }
        finally {setLoginBusy(false);}
    };
    const logout = async () => {
        const session = await fetch("/api/operator",{cache:"no-store"}).then(r=>r.json());
        await fetch("/api/operator",{method:"DELETE",headers:{"X-PayFlow-Csrf":session.csrf || ""}});
        setOperator(null); setOrders([]); setCatalog([]); setOperations([]); setLoaded(false); setSelected(null);
    };
    useEffect(()=>{if(loginOpen) loginRef.current?.showModal();else loginRef.current?.close();},[loginOpen]);
    const [space, setSpace] = useState<Space>("overview");
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [catalog, setCatalog] = useState<ProductRow[]>([]);
    const [operations, setOperations] = useState<OperationRow[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [updated, setUpdated] = useState<Date | null>(null);
    const [selected, setSelected] = useState<OrderRow | null>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [query, setQuery] = useState("");
    const [prompt, setPrompt] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [gridRowCount, setGridRowCount] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const quoteAttempt = useRef<{prompt:string;id:string} | null>(null);
    const [notice, setNotice] = useState<{
        tone: string;
        title: string;
        detail: string;
    } | null>(null);
    const [confirmation, setConfirmation] = useState<{
        action: string;
        label: string;
        order: OrderRow;
        channel?: string;
        capture?: boolean;
    } | null>(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState("");
    useEffect(()=>{setActionError("");},[confirmation]);
    const [trackingError, setTrackingError] = useState("");
    const gridRef = useRef<AgGridReact<OrderRow>>(null);
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const confirmRef = useRef<HTMLDialogElement>(null);
    const refresh = useCallback(async (orderId?: string) => {
        setRefreshing(true);
        setLoadError("");
        try {
            const { data } = await callPayFlow({ action: "get_dashboard_state" });
            if (data.status !== "success" || !Array.isArray(data.orders) || !Array.isArray(data.catalog) || !Array.isArray(data.operations))
                throw new Error("The received data is incomplete. Please try again.");
            setOrders(data.orders);
            setCatalog(data.catalog);
            setOperations(data.operations);
            setLoaded(true);
            setUpdated(new Date());
            setSelected(prev => orderId ? data.orders.find((o: OrderRow) => o.id === orderId) || null : prev ? data.orders.find((o: OrderRow) => o.id === prev.id) || null : null);
        }
        catch (e) {
            setLoadError(e instanceof Error ? e.message : "Unable to load your activity.");
        }
        finally {
            setRefreshing(false);
        }
    }, []);
    useEffect(() => { void fetch("/api/operator",{cache:"no-store"}).then(r=>r.json()).then(data=>{
        if(data.authenticated) {setOperator(data.user.username);void refresh();} else setRefreshing(false);
    }).catch(()=>{setRefreshing(false);setLoadError("Authentication unavailable.");}); }, [refresh]);
    useEffect(() => {
        const sync = () => {
            const candidate = window.location.hash.slice(1);
            if (["overview", "orders", "studio", "catalog", "audit"].includes(candidate))
                setSpace(candidate as Space);
        };
        sync();
        window.addEventListener("hashchange", sync);
        return () => window.removeEventListener("hashchange", sync);
    }, []);
    useEffect(() => { if (selected)
        dialogRef.current?.showModal();
    else
        dialogRef.current?.close(); }, [selected]);
    useEffect(() => { if (confirmation)
        confirmRef.current?.showModal();
    else
        confirmRef.current?.close(); }, [confirmation]);
    useEffect(() => {
        setTrackingError("");
        if(!operator || !selected?.invoice?.paypal_invoice_id || isCaptured(selected) || isSimulated(selected) || ["CANCELLED","OVERDUE"].includes(selected.status)) return;
        let stopped=false, inFlight=false;
        const orderId=selected.id;
        const verify=async () => {
            if(stopped || inFlight || document.visibilityState!=="visible") return;
            inFlight=true;
            try {
                await callPayFlow({action:"reconcile_payment",order_id:orderId});
                if(!stopped) {setTrackingError("");await refresh(orderId);}
            } catch(e) {if(!stopped) setTrackingError(e instanceof Error ? e.message : "PayPal verification unavailable.");}
            finally {inFlight=false;}
        };
        void verify();
        const timer=window.setInterval(()=>void verify(),30000);
        return ()=>{stopped=true;window.clearInterval(timer);};
    },[operator,selected?.id,selected?.status,selected?.invoice?.paypal_status,refresh]);
    const navigate = (next: Space) => { setSpace(next); setQuery(""); setGridRowCount(null); window.location.hash = next; };
    const newQuote = () => { if (!operator) { setLoginOpen(true); return; } navigate("overview"); requestAnimationFrame(() => { promptRef.current?.focus(); promptRef.current?.scrollIntoView({block:"center",behavior:"smooth"}); }); };
    const captured = orders.filter(isCaptured);
    const pending = orders.filter(o => o.status === "PENDING_APPROVAL");
    const awaiting = orders.filter(o => ["APPROVED", "INVOICE_SENT"].includes(o.status));
    const simulated = orders.filter(isSimulated);
    const sum = (rows: OrderRow[]) => rows.reduce((total, o) => total + Number(o.total_amount || 0), 0);
    const filtered = useMemo(() => orders.filter(o => statusFilter === "ALL" || (statusFilter === "CAPTURED" ? isCaptured(o) : statusFilter === "SIMULATED" ? isSimulated(o) : statusFilter === "AWAITING_PAYMENT" ? ["APPROVED", "INVOICE_SENT"].includes(o.status) : statusFilter === "BLOCKED_OR_REJECTED" ? ["BLOCKED_ANOMALY", "REJECTED", "CANCELLED", "OVERDUE"].includes(o.status) : o.status === statusFilter)), [orders, statusFilter]);
    const priority = [...pending, ...orders.filter(o => o.status === "BLOCKED_ANOMALY"), ...awaiting];
    const metrics = [
        { label: "Confirmed receipts", value: sum(captured), count: `${captured.length} PayPal capture${captured.length > 1 ? "s" : ""}`, icon: ArrowDownLeft, tone: "mint", hint: "Confirmed PayPal Sandbox captures", filter: "CAPTURED" },
        { label: "Needs review", value: sum(pending), count: `${pending.length} order${pending.length > 1 ? "s" : ""} to review`, icon: Clock3, tone: "amber", hint: "Your internal approval is required", filter: "PENDING_APPROVAL" },
        { label: "Awaiting payment", value: sum(awaiting), count: `${awaiting.length} active order${awaiting.length > 1 ? "s" : ""}`, icon: Wallet, tone: "blue", hint: "Internally approved orders or issued links", filter: "AWAITING_PAYMENT" },
    ];
    const generateQuote = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!prompt.trim() || busy)
            return;
        if (/\[(nom du client|email du client|client name|client email)\]/i.test(prompt)) { setNotice({tone:"warning",title:"Complete the customer details",detail:"Replace the bracketed fields with your customer's name and email before preparing the quote."}); promptRef.current?.focus(); return; }
        const quotePrompt = `Client: ${customerName.trim()} (${customerEmail.trim()}). ${prompt.trim()}`;
        setBusy(true);
        setNotice(null);
        try {
            if(quoteAttempt.current?.prompt !== quotePrompt) quoteAttempt.current={prompt:quotePrompt,id:`ORD-${crypto.randomUUID()}`};
            const { data, httpStatus } = await callPayFlow({ action: "ai_copilot_quote", order_id:quoteAttempt.current.id, prompt: quotePrompt });
            if (!data.order_id)
                throw new Error(displayMessage(data.message, "No quote was created. Check your request."));
            await refresh(data.order_id);
            quoteAttempt.current=null;
            const blocked = httpStatus === 422 || data.order_status === "BLOCKED_ANOMALY";
            const fallback = data.llm_proof?.llm_invoked !== true;
            setNotice({ tone: blocked || fallback ? "warning" : data.order_status === "PENDING_APPROVAL" ? "warning" : "success", title: blocked ? "Order blocked by checks" : fallback ? "Quote created using fallback processing" : data.order_status === "PENDING_APPROVAL" ? "Quote ready for review" : "Quote created", detail: (data.copilot_explanation || "Prices, margins and stock have been checked.") + (fallback ? " Gemini did not respond; the engine used fallback processing." : "") });
        }
        catch (e) {
            setNotice({ tone: "error", title: "The quote could not be created", detail: e instanceof Error ? e.message : "Please try again shortly." });
        }
        finally {
            setBusy(false);
        }
    };
    const executeAction = async () => {
        if (!confirmation || !financialActionsEnabled || actionBusy)
            return;
        setActionBusy(true); setActionError("");
        try {
            const { data } = await callPayFlow({ action: confirmation.action, order_id: confirmation.order.id, approval_token: confirmation.order.approval?.approval_token, channel: confirmation.channel, capture_approved_payment: confirmation.capture === true, decision_notes: "Décision confirmée dans PayFlow AI" });
            await refresh(confirmation.order.id);
            setNotice({ tone: "success", title: "Operation completed", detail: displayMessage(data.message, "The order status has been updated.") });
            setConfirmation(null);
        }
        catch (e) {
            setActionError(e instanceof Error ? e.message : "Please try again.");
            setNotice({ tone: "error", title: "Operation rejected", detail: e instanceof Error ? e.message : "Please try again." });
        }
        finally {
            setActionBusy(false);
        }
    };
    const orderColumns = useMemo<ColDef<OrderRow>[]>(() => [
        { field: "quote_number", headerName: "Order", minWidth: 240, flex: 1, cellRenderer: (p: ICellRendererParams<OrderRow>) => <div className="grid-stack"><strong>{p.value}</strong><small>{p.data ? new Date(p.data.created_at).toLocaleDateString("en-US") : ""}</small></div> },
        { field: "customer_company", headerName: "Customer", minWidth: 280, flex: 1.6, cellRenderer: (p: ICellRendererParams<OrderRow>) => <div className="grid-stack"><strong>{p.value || p.data?.customer_name}</strong><small>{p.data?.customer_email}</small></div> },
        { field: "total_amount", headerName: "Amount", minWidth: 130, flex: 1, cellDataType: "number", valueGetter: p => Number(p.data?.total_amount || 0), valueFormatter: p => money(p.value) },
        { field: "computed_margin_pct", headerName: "Margin", width: 100, cellDataType: "number", valueGetter: p => Number(p.data?.computed_margin_pct || 0), valueFormatter: p => `${Number(p.value).toFixed(1)} %` },
        { field: "status", headerName: "Status", minWidth: 200, flex: 1.2, valueFormatter: p => p.data ? settlementLabel(p.data) : "", getQuickFilterText: p => p.data ? settlementLabel(p.data) : "", cellRenderer: (p: ICellRendererParams<OrderRow>) => p.data ? <Status order={p.data}/> : null },
        { headerName: "", width: 110, pinned: "right", lockPinned: true, sortable: false, filter: false, cellRenderer: (p: ICellRendererParams<OrderRow>) => <button className="grid-open" aria-label={`View ${p.data?.quote_number}`} onClick={() => setSelected(p.data || null)}>View <ChevronRight size={14}/></button> },
    ], []);
    const catalogColumns = useMemo<ColDef<ProductRow>[]>(() => [
        { field: "name", headerName: "Product", minWidth: 290, flex: 2, cellRenderer: (p: ICellRendererParams<ProductRow>) => <div className="grid-stack"><strong>{p.value}</strong><small>{p.data?.sku}</small></div> },
        { field: "category", headerName: "Category", minWidth: 140, flex: 1, valueFormatter: p => ({ PRESTIGE_WINE: "Prestige wines", CHAMPAGNE: "Champagne", WHITE_WINE: "White wines", SPIRITS: "Spirits" } as Record<string, string>)[p.value] || p.value },
        { field: "unit_price", headerName: "Price", width: 125, cellDataType: "number", valueGetter: p => Number(p.data?.unit_price || 0), valueFormatter: p => money(p.value) },
        { field: "stock_on_hand", headerName: "On-hand stock", width: 145, cellDataType: "number", valueGetter: p => Number(p.data?.stock_on_hand || 0) },
        { field: "stock_reserved", headerName: "Reserved stock", width: 145, cellDataType: "number", valueGetter: p => Number(p.data?.stock_reserved || 0) },
        { field: "available_stock", headerName: "Available", width: 125, cellDataType: "number", valueGetter: p => Number(p.data?.available_stock || 0), cellClass: "stock-available" },
        { headerName: "Catalogue margin", width: 165, cellDataType: "number", valueGetter: p => p.data && Number(p.data.unit_price) > 0 ? (1 - Number(p.data.unit_cost) / Number(p.data.unit_price)) * 100 : 0, valueFormatter: p => `${Number(p.value).toFixed(1)} %` },
    ], []);
    const auditColumns: ColDef<OperationRow>[] = [{ field: "order_id", headerName: "Order", minWidth: 190 }, { field: "operation_type", headerName: "Operation", minWidth: 170 }, { field: "status", headerName: "State", width: 140 }, { field: "attempt_count", headerName: "Attempts", width: 115 }, { field: "http_status", headerName: "HTTP", width: 90 }, { field: "paypal_request_id", headerName: "Idempotency key", minWidth: 260 }, { field: "last_error", headerName: "Last error", minWidth: 220 }];
    const studioOrders = useMemo<StudioOrderRow[]>(() => orders.map(o => ({ ...o, customer_company:o.customer_company || o.customer_name, subtotal_amount: Number(o.subtotal_amount || 0), discount_amount: Number(o.discount_amount || 0), total_amount: Number(o.total_amount || 0), total_cost_amount: Number(o.total_cost_amount || 0), computed_margin_pct: Number(o.computed_margin_pct || 0), settlement_label: settlementLabel(o), requires_hitl: Boolean(o.requires_hitl) })), [orders]);
    const studioItems = useMemo<StudioOrderItemRow[]>(() => orders.flatMap(o => (o.items || []).map(it => ({ id: `${o.id}-${it.id}`, order_id: o.id, sku: it.sku, product_name: it.product_name, quantity: Number(it.quantity || 0), applied_unit_price: Number(it.applied_unit_price || 0), discount_pct: Number(it.discount_pct || 0), line_total: Number(it.line_total || 0), line_margin_pct: Number(it.line_margin_pct || 0) }))), [orders]);
    const studioProducts = useMemo<StudioProductRow[]>(() => catalog.map(p => ({ ...p, unit_price: Number(p.unit_price), unit_cost: Number(p.unit_cost), stock_on_hand: Number(p.stock_on_hand), stock_reserved: Number(p.stock_reserved), available_stock: Number(p.available_stock), max_discount_pct: Number(p.max_discount_pct), min_margin_pct: Number(p.min_margin_pct) })), [catalog]);
    const studioOperations = useMemo<StudioOperationRow[]>(() => operations.map(op => ({ ...op, attempt_count: Number(op.attempt_count), http_status: Number(op.http_status), paypal_resource_id: op.paypal_resource_id || "" })), [operations]);
    const nextStep = selected ? nextOrderStep(selected) : null;
    return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => navigate("overview")}><span className="brand-mark"><LayersMark /></span><span>PayFlow<span className="brand-ai">AI</span></span></a>
      <div className="workspace"><span className="workspace-avatar">P</span><div><strong>Business workspace</strong><small>B2B commerce</small></div><ShieldCheck size={16}/></div>
      <span className="nav-caption">WORKSPACE</span>
      <nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-label={label} aria-current={space === id ? "page" : undefined} onClick={() => navigate(id)} className={`nav-link ${space === id ? "active" : ""}`}><Icon size={19}/>{label}{id === "orders" && loaded && <span className="nav-count" aria-hidden="true">{orders.length}</span>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="sandbox-card"><span className="sandbox-dot"/><strong>PayPal Sandbox</strong><p>Demo environment</p></div><a href="#audit" className={`nav-link ${space === "audit" ? "active" : ""}`} onClick={() => navigate("audit")}><ShieldCheck size={18}/>Administration / Audit</a><div className="operator"><span className="operator-avatar"><LockKeyhole size={17}/></span><div><strong>{operator ? "Operator signed in" : "Sign-in required"}</strong><small>{operator ? "Authorized and recorded actions" : "Protected financial actions"}</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Business workspace <ChevronRight size={14}/><span>{space === "audit" ? "Audit" : navigation.find(n=>n.id===space)?.label}</span></div><div className="topbar-right"><span className="environment"><span/>PayPal Sandbox</span><button className="button secondary" onClick={()=>operator ? void logout() : setLoginOpen(true)}>{operator ? "Sign out" : "Sign in"}</button></div></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">PAYFLOW AI / {space === "overview" ? "YOUR ACTIVITY" : "BUSINESS WORKSPACE"}</div><h1>{titles[space][0]}</h1><p>{titles[space][1]}</p></div><div className="heading-actions"><button className="button secondary icon-button" disabled={!operator || refreshing} onClick={() => void refresh()} aria-label="Refresh data"><RefreshCw size={17} className={refreshing ? "spin" : ""}/></button>{space !== "overview" && <button className="button primary" onClick={newQuote}><Sparkles size={17}/>New quote</button>}</div></div>
        {!operator && <section className="welcome-panel" aria-labelledby="welcome-title"><div className="welcome-copy"><span className="eyebrow">YOUR SALES WORKSPACE</span><h2 id="welcome-title">One request. One checked quote.<br/>One tracked payment.</h2><p>Gemini prepares quotes from customer requests. PayFlow checks stock, discounts and margins. PayPal handles the payment.</p><button className="button primary" onClick={()=>setLoginOpen(true)}><LockKeyhole size={17}/>Open my workspace <ArrowRight size={17}/></button><small>Your operator session protects your data and actions.</small></div><div className="welcome-steps"><div><span>01</span><h3>Prepare the quote</h3><p>Describe the customer, products and quantities to Gemini.</p></div><div><span>02</span><h3>Stay in control</h3><p>Review the checks and approve orders that need your decision.</p></div><div><span>03</span><h3>Track the payment</h3><p>Track the PayPal status and analyse your activity in AG Studio.</p></div></div></section>}
        {operator && <>
        {loadError && <div className="notice error" role="alert"><AlertTriangle /><div><strong>{loaded ? "Refresh unavailable" : "Connection unavailable"}</strong><p>{loadError}{loaded ? " The last loaded data is still displayed." : " No amount can be confirmed at this time."}</p></div><button className="button secondary" onClick={() => void refresh()}>Try again</button></div>}
        {notice && <div className={`notice ${notice.tone}`} role="status"><CheckCircle2 /><div><strong>{notice.title}</strong><p>{notice.detail}</p></div><button className="close-button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={18}/></button></div>}
        {space === "overview" && <>
          <div className="quote-workspace">            <section className="panel assistant-panel"><div className="panel-heading"><div className="assistant-title"><span className="assistant-icon"><Sparkles size={20}/></span><div><h2>Prepare your next quote</h2><p>Describe the request. Gemini prepares the quote and PayFlow checks it.</p></div></div><span className="ai-label">GEMINI</span></div><form onSubmit={generateQuote}><div className="customer-fields"><div><label htmlFor="customer-name">Customer name</label><input id="customer-name" autoComplete="organization" value={customerName} onChange={e => setCustomerName(e.target.value)} required maxLength={128} disabled={busy} placeholder="Customer or company"/></div><div><label htmlFor="customer-email">Email</label><input id="customer-email" type="email" autoComplete="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required maxLength={254} disabled={busy} placeholder="customer@example.com"/></div></div><div className="demo-customer"><button type="button" className="text-button" disabled={busy} onClick={() => { setCustomerName("Demo customer"); setCustomerEmail("demo@example.invalid"); }}>Use fictional demo customer</button>{customerName === "Demo customer" && customerEmail === "demo@example.invalid" && <span>Fictional customer for Sandbox testing.</span>}</div><label htmlFor="quote-prompt">Products, quantities and requested discount</label><textarea id="quote-prompt" ref={promptRef} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="For example: 1 case of Champagne Brut with a 5% discount…" aria-describedby="quote-help" required maxLength={5500} disabled={busy}/><div className="assistant-submit"><span><ShieldCheck size={15}/>Prices, margins and stock checked</span><button className="button primary" disabled={!financialActionsEnabled || !customerName.trim() || !customerEmail.trim() || !prompt.trim() || busy} type="submit">{busy ? <><RefreshCw size={16} className="spin"/>Analysing…</> : <>Prepare quote <ArrowRight size={16}/></>}</button></div><p id="quote-help" className="form-help">The customer details above are included in your request. PayFlow checks the catalogue prices, margins and stock.</p><div className="prompt-examples"><span>Request examples</span>{presets.map(p => <button type="button" disabled={busy} key={p.label} onClick={() => { setPrompt(p.prompt); promptRef.current?.focus(); }}>{p.label}</button>)}</div></form></section><details className="sales-guide"><summary>How PayFlow works <span>Quote → checks → payment</span></summary><ol><li><span>01</span><div><strong>The quote, with Gemini</strong><p>AI turns your request into proposed products, quantities and prices.</p></div></li><li><span>02</span><div><strong>The checks, with PayFlow</strong><p>Stock, margins and discounts are checked. You approve where required.</p></div></li><li><span>03</span><div><strong>The payment, with PayPal</strong><p>Create the link, then track buyer approval and payment capture.</p></div></li></ol><div className="guide-footer"><ShieldCheck size={18}/><p>You stay in control of approvals and captures.</p></div></details></div>
          <div className="metrics">{metrics.map(({ label, value, count, icon: Icon, tone, hint, filter }) => <button className="metric" key={label} onClick={() => { setStatusFilter(filter); navigate("orders"); }}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={19}/></span></div><div className="metric-value">{loaded ? money(value) : "—"}</div><div className="metric-bottom"><span className={`mini-dot ${tone}`}/>{loaded ? count : refreshing ? "Loading activity…" : "Data unavailable"}</div><small>{hint}</small></button>)}</div>
          <div className="activity-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Stay one step ahead.</h2></div><button className="text-button" onClick={()=>navigate("studio")}>Explore in AG Studio <ArrowRight size={16}/></button></div>
            <section className="panel priorities"><div className="panel-heading"><div><h2>Next actions <span className="count-pill">{loaded ? priority.length : "—"}</span></h2><p>Open an order to take its next step.</p></div><span className="small-icon"><Clock3 size={19}/></span></div>
              {!loaded ? <Empty title={refreshing ? "Loading your orders…" : "Your activity is unavailable"} detail="Priority actions will appear here."/> : priority.length === 0 ? <Empty title="Everything is up to date" detail="No order needs your attention."/> : <div className="priority-list">{priority.slice(0, 4).map(o => <button className="priority-row" key={o.id} onClick={() => setSelected(o)}><span className={`priority-icon ${o.status === "PENDING_APPROVAL" ? "amber" : "blue"}`}>{o.status === "PENDING_APPROVAL" ? <Clock3 size={19}/> : <FileText size={19}/>}</span><span className="priority-copy"><strong>{o.customer_company || o.customer_name}</strong><small>{o.status === "PENDING_APPROVAL" ? "Internal approval required" : o.status === "BLOCKED_ANOMALY" ? "An issue needs review" : o.status === "APPROVED" ? "Ready for a payment link" : "Awaiting buyer payment"}</small></span><span className="priority-amount">{money(o.total_amount)}<small>{o.quote_number}</small></span><ChevronRight size={17}/></button>)}</div>}
              <button className="text-button panel-footer" onClick={() => { setStatusFilter("ALL"); navigate("orders"); }}>View all orders <ArrowRight size={16}/></button>
            </section>
          <div className="overview-footnote"><span><ShieldCheck size={15}/>Receipts: confirmed captures in the Sandbox environment.</span>{simulated.length > 0 && <span>{simulated.length} simulated payment · {money(sum(simulated))} · excluded from receipts</span>}</div>
        </>}
        {space === "orders" && <div className="section-context"><ShieldCheck size={21}/><p><strong>The right action for each status.</strong> Open a quote to review its checks, prepare its PayPal link or find payment evidence.</p></div>}
        {space === "catalog" && <div className="stock-guide">{[{label:"On hand",field:"stock_on_hand" as const,Icon:Package,detail:"units on hand"},{label:"Reserved",field:"stock_reserved" as const,Icon:LockKeyhole,detail:"units reserved"},{label:"Available",field:"available_stock" as const,Icon:CheckCircle2,detail:"units available"}].map(({label,field,Icon,detail})=><div key={field}><Icon size={20}/><strong>{label}</strong><span className="stock-total">{loaded ? catalog.reduce((total,p)=>total+Number(p[field] || 0),0).toLocaleString("en-US") : "—"}</span><p>{detail} · {loaded ? catalog.length : "—"} catalogue products</p></div>)}</div>}
        {(space === "orders" || space === "catalog" || space === "audit") && <section className="panel data-panel"><div className="panel-heading"><div><h2>{space === "orders" ? "Your orders" : space === "catalog" ? "Products & stock" : "Operation log"} <span className="count-pill">{loaded ? (space === "orders" ? orders.length : space === "catalog" ? catalog.length : operations.length) : "—"}</span></h2><p>{space === "catalog" ? "Available = on-hand stock − reserved stock." : space === "orders" ? "Select an order to inspect its products and checks." : "PayPal operations, attempts and service responses."}</p></div>{space === "orders" && <button className="button secondary" disabled={!loaded} onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: "payflow-orders.csv" })}><Download size={16}/>Export</button>}</div>
          <div className="data-toolbar">{space === "orders" && <div className="filter-tabs" aria-label="Filter by status">{filters.filter(f => ["ALL", "PENDING_APPROVAL", "AWAITING_PAYMENT", "CAPTURED"].includes(f.id)).map(f => <button key={f.id} aria-pressed={statusFilter === f.id} className={statusFilter === f.id ? "selected" : ""} onClick={() => setStatusFilter(f.id)}>{f.label}</button>)}<details className="more-filters"><summary>More filters{!["ALL", "PENDING_APPROVAL", "AWAITING_PAYMENT", "CAPTURED"].includes(statusFilter) ? ` · ${filters.find(f => f.id === statusFilter)?.label}` : ""}</summary><div>{filters.filter(f => !["ALL", "PENDING_APPROVAL", "AWAITING_PAYMENT", "CAPTURED"].includes(f.id)).map(f => <button key={f.id} aria-pressed={statusFilter === f.id} className={statusFilter === f.id ? "selected" : ""} onClick={() => setStatusFilter(f.id)}>{f.label}</button>)}</div></details></div>}<label className="search-input"><Search size={17}/><input aria-label={space === "orders" ? "Search orders" : space === "catalog" ? "Search products" : "Search operations"} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"/></label></div>
          {!loaded ? <Empty title={refreshing ? "Loading data…" : "Data unavailable"} detail="Refresh the page to try again."/> : <div className="ag-theme-quartz payflow-grid" style={{ height: Math.min(560, Math.max(170, 66 + (gridRowCount ?? (space === "orders" ? filtered.length : space === "catalog" ? catalog.length : operations.length)) * (space === "audit" ? 64 : 84))) }}>{space === "orders" ? <AgGridReact<OrderRow> key="orders" onModelUpdated={e => setGridRowCount(e.api.getDisplayedRowCount())} ref={gridRef} rowData={filtered} columnDefs={orderColumns} quickFilterText={query} onFilterChanged={event => event.api.getDisplayedRowCount() === 0 ? event.api.showNoRowsOverlay() : event.api.hideOverlay()} rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }} onRowClicked={e => e.data && setSelected(e.data)} defaultColDef={{ sortable: true, filter: true, resizable: true }} rowHeight={84} headerHeight={46} overlayNoRowsTemplate="No orders match your filters."/> : space === "catalog" ? <AgGridReact<ProductRow> key="catalog" onModelUpdated={e => setGridRowCount(e.api.getDisplayedRowCount())} rowData={catalog} columnDefs={catalogColumns} quickFilterText={query} onFilterChanged={event => event.api.getDisplayedRowCount() === 0 ? event.api.showNoRowsOverlay() : event.api.hideOverlay()} defaultColDef={{ sortable: true, filter: true, resizable: true }} rowHeight={68} headerHeight={46} overlayNoRowsTemplate="No products to display."/> : <AgGridReact<OperationRow> key="audit" onModelUpdated={e => setGridRowCount(e.api.getDisplayedRowCount())} rowData={operations} columnDefs={auditColumns} quickFilterText={query} onFilterChanged={event => event.api.getDisplayedRowCount() === 0 ? event.api.showNoRowsOverlay() : event.api.hideOverlay()} defaultColDef={{ sortable: true, filter: true, resizable: true }} rowHeight={56} headerHeight={46} overlayNoRowsTemplate="No operations to display."/>}</div>}
          <p className="table-scroll-hint">Scroll horizontally to see all columns.</p><div className="data-footer"><span>{space === "orders" ? "Confirmed receipts and simulations have separate filters." : space === "catalog" ? "Catalogue margin is calculated before discounts and taxes." : "Logs are retained by the PayFlow engine."}</span><span>Source: PayFlow</span></div>
        </section>}
        {space === "studio" && (loaded ? <Studio key={orders.map(o=>`${o.id}:${o.updated_at || o.status}:${o.total_amount}`).join("|")} orders={studioOrders} orderItems={studioItems} products={studioProducts} operations={studioOperations} summary={{ total_orders: orders.length, pending_hitl_count: pending.length, approved_count: orders.filter(o => o.status === "APPROVED").length, invoice_sent_count: orders.filter(o => o.status === "INVOICE_SENT").length, paid_orders_count: captured.length, paid_revenue_usd: sum(captured), simulated_test_paid_count: simulated.length, simulated_test_paid_usd: sum(simulated), pipeline_revenue_usd: sum(awaiting), average_margin_pct: orders.length ? orders.reduce((s, o) => s + Number(o.computed_margin_pct || 0), 0) / orders.length : 0 }} onApplyStatusFilter={setStatusFilter}/> : <Empty title={refreshing ? "Loading analytics sources…" : "Analytics unavailable"} detail="Charts will appear once the data is loaded."/>)}
        {space === "audit" && <section className="panel audit-note"><LockKeyhole /><div><h2>Financial action protection</h2><p>Approval, rejection, PayPal creation and reconciliation require a server-verified operator session. Decisions are signed and recorded; server keys are never sent to the browser.</p><p>AG Studio 3.0 uses four related sources: orders, order lines, products and operations. An appropriate licence is required to remove the evaluation watermark.</p></div></section>}
        </>}
        <footer className="page-footer"><span>PayFlow AI <span className="footer-separator">/</span> Commerce under control <a className="mobile-audit" href="#audit" onClick={() => navigate("audit")}>Administration / Audit</a></span><span aria-live="polite">{refreshing ? "Refreshing…" : updated ? `Updated at ${updated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : "Awaiting sign-in"}</span></footer>
      </main>
    </div>
    <dialog ref={loginRef} className="confirm-dialog" aria-labelledby="login-title" onCancel={()=>setLoginOpen(false)} onClose={()=>setLoginOpen(false)}>
      <form onSubmit={login}><span className="login-symbol"><LockKeyhole size={24}/></span><h2 id="login-title">Welcome to PayFlow.</h2><p>Sign in to prepare quotes and track payments.</p><label htmlFor="operator-username">Username</label><input id="operator-username" name="username" autoComplete="username" required maxLength={128}/><label htmlFor="operator-password">Password</label><input id="operator-password" name="password" type="password" autoComplete="current-password" required maxLength={256}/>{loginError && <p role="alert">{loginError}</p>}<div className="order-actions"><button type="button" className="button secondary" onClick={()=>setLoginOpen(false)}>Cancel</button><button className="button primary" disabled={loginBusy} type="submit">{loginBusy ? "Signing in…" : "Sign in"}</button></div></form>
    </dialog>
    <dialog ref={dialogRef} className="order-dialog" aria-labelledby="order-dialog-title" onCancel={() => setSelected(null)} onClose={() => setSelected(null)}>{selected && <><div className="order-dialog-body">
      <div className="dialog-heading"><div><span className="eyebrow">ORDER DETAILS</span><h2 id="order-dialog-title">{selected.quote_number}</h2><Status order={selected}/></div><button className="close-button" aria-label="Close order" onClick={() => setSelected(null)}><X /></button></div>
      <ol className="order-journey" aria-label="Order progress">{orderJourney(selected).map((step,i)=><li key={step.title} className={step.state} aria-current={step.state === "current" ? "step" : undefined}><span>{step.state === "done" ? <Check size={15}/> : i+1}</span><div><strong>{step.title}</strong><small>{({done:"Confirmed",current:"Current step",waiting:"Upcoming",stop:"Stopped"} as Record<string,string>)[step.state]}</small></div></li>)}</ol>
      {nextStep && <div className={`next-step ${nextStep.tone}`}><div className="eyebrow">{isCaptured(selected) ? "PAID ORDER" : "NEXT STEP"}</div><h3>{nextStep.title}</h3><p>{nextStep.detail}</p></div>}
      <div className="order-summary"><div><small>CUSTOMER</small><h3>{selected.customer_company || selected.customer_name}</h3><p>{selected.customer_name}</p><p>{selected.customer_email}</p></div><div><small>TOTAL AMOUNT</small><strong>{money(selected.total_amount)}</strong><p>Margin: {Number(selected.computed_margin_pct).toFixed(1)} %</p><p>Discount: {money(selected.discount_amount)}</p></div></div>
      {(selected.anomaly_flags || []).length > 0 ? <div className="order-anomalies"><h3><AlertTriangle size={17}/>Understand the checks</h3><ul className="control-explanations">{selected.anomaly_flags.map((a, i) => { const explanation = explainControl(a, selected); return <li key={i}><strong>{explanation.title}</strong><span className="control-subject">{explanation.subject}</span><p>{explanation.detail}</p><p className="control-guidance">{explanation.guidance}</p></li>; })}</ul></div> : <div className="control-ok"><Check size={17}/>No issues reported by the checks</div>}
      <h3 className="detail-label">Order products</h3><div className="table-scroll"><table className="business-table detail-table"><thead><tr><th>Product</th><th>Qty</th><th>Applied price</th><th>Discount</th><th>Margin</th><th>Reserved</th><th>Total</th></tr></thead><tbody>{(selected.items || []).map(it => <tr key={it.id}><td><strong>{it.product_name}</strong><small>{it.sku}</small></td><td>{it.quantity}</td><td>{money(it.applied_unit_price)}</td><td>{Number(it.discount_pct).toFixed(1)} %</td><td>{Number(it.line_margin_pct).toFixed(1)} %</td><td>{it.stock_reserved_qty}</td><td>{money(it.line_total)}</td></tr>)}</tbody></table></div>
      <details className="payment-detail"><summary>Payment status & evidence</summary><p><strong>Internal approval:</strong> {selected.status === "PENDING_APPROVAL" ? "required" : ["APPROVED","INVOICE_SENT","PAID"].includes(selected.status) ? "completed" : settlementLabel(selected)}.</p><p><strong>Customer acceptance of the quote:</strong> not recorded in this flow. Internal approval is not customer acceptance.</p><p><strong>Buyer payment approval:</strong> {orderJourney(selected)[2].state === "done" ? "confirmed by PayPal" : "not confirmed"}.</p><p>{isSimulated(selected) ? "Simulated transaction: no confirmed PayPal receipt." : isCaptured(selected) ? "Capture confirmed by PayPal Sandbox." : selected.invoice ? "The transaction has been created. Payment still needs confirmation." : "No PayPal transaction has been created."}</p>{selected.invoice && <dl><div><dt>PayPal status</dt><dd>{selected.invoice.paypal_status}</dd></div><div><dt>Reference</dt><dd>{selected.invoice.paypal_invoice_id}</dd></div><div><dt>Capture</dt><dd>{selected.invoice.capture_id || "Not confirmed"}</dd></div></dl>}{selected.invoice && <p>Last check: {selected.invoice.last_reconciled_at ? new Date(selected.invoice.last_reconciled_at).toLocaleString("en-US") : "not performed"}. {!isCaptured(selected) && !isSimulated(selected) && !["CANCELLED","OVERDUE"].includes(selected.status) ? "Automatically checked while these details are open." : "Last confirmed status retained."}</p>}</details>{trackingError && <p className="notice error" role="alert">{trackingError} The last confirmed status is retained.</p>}
<details className="technical-details"><summary>History & diagnostics</summary><p>Order : {selected.id}</p><p>Checks: {selected.control_summary}</p>{(selected.anomaly_flags || []).length > 0 && <><p>Original engine messages:</p><ul>{selected.anomaly_flags.map((a, i) => <li key={i}><code>{a.code}</code><p>{a.message}</p></li>)}</ul></>}<p>Approval: {selected.approval?.status || "Not required"}</p><p>Expiry: {selected.approval?.expires_at || "—"}</p>{selected.status === "APPROVED" && !selected.invoice && <button className="button secondary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action: "create_paypal_transaction", label: "Issue a Sandbox invoice", order: selected, channel: "INVOICING_V2" })}>Issue a Sandbox invoice (diagnostic)</button>}</details>
    </div><div className="order-action-bar"><p className="order-decision-note">Internal approval is not customer acceptance or payment confirmation.</p>      {!operator && <div className="locked-notice"><LockKeyhole size={18}/><span>Sign in as an operator to perform a financial action.</span></div>}<div className="order-actions">
        {selected.status === "PENDING_APPROVAL" && <><button className="button primary" disabled={!financialActionsEnabled || actionBusy || !selected.approval?.approval_token} onClick={() => setConfirmation({ action: "approve_order", label: "Approve the order internally", order: selected })}>Approve internally</button><button className="button secondary" disabled={!financialActionsEnabled || actionBusy || !selected.approval?.approval_token} onClick={() => setConfirmation({ action: "reject_order", label: "Reject and release stock", order: selected })}>Reject</button></>}
        {!selected.invoice && ["DRAFT","PENDING_APPROVAL","APPROVED"].includes(selected.status) && <button className="button secondary" disabled={!financialActionsEnabled || actionBusy} onClick={()=>setConfirmation({action:"cancel_order",label:"Cancel this quote and release stock",order:selected})}>Cancel quote</button>}
        {selected.status === "APPROVED" && !selected.invoice && <button className="button primary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action: "create_paypal_transaction", label: "Create the PayPal Sandbox link", order: selected, channel: "ORDERS_V2" })}>Create PayPal link</button>}
        {selected.invoice?.recipient_view_url && /^https:\/\/([a-z0-9-]+\.)*sandbox\.paypal\.com\//i.test(selected.invoice.recipient_view_url) && !isSimulated(selected) && !["PAID","CANCELLED","OVERDUE"].includes(selected.status) && <a href={selected.invoice.recipient_view_url} target="_blank" rel="noopener noreferrer" className="button secondary">Open PayPal checkout <ArrowUpRight size={15}/></a>}
        {selected.invoice?.resource_type === "PAYPAL_ORDER_V2" && selected.invoice.paypal_status === "APPROVED" && <button className="button primary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action:"reconcile_payment",label:"Capture the approved payment",order:selected,capture:true })}>Capture payment</button>}
        {selected.invoice?.paypal_invoice_id && <button className="button secondary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action: "reconcile_payment", label: "Check and reconcile payment", order: selected })}>Refresh PayPal status</button>}
      </div><button className="text-button" onClick={() => setSelected(null)}>Close details</button></div></>}</dialog>
    <dialog className="confirm-dialog" aria-labelledby="confirm-dialog-title" ref={confirmRef} onCancel={() => setConfirmation(null)} onClose={() => setConfirmation(null)}>{confirmation && <><h2 id="confirm-dialog-title">{confirmation.label} ?</h2><p>{confirmation.order.customer_company || confirmation.order.customer_name} · {confirmation.order.quote_number}</p><strong>{money(confirmation.order.total_amount)}</strong><p>{confirmation.action === "cancel_order" ? "The quote will be cancelled and reserved stock released." : confirmation.action === "reject_order" ? "The order will be rejected and reserved stock released." : confirmation.action === "reconcile_payment" ? (confirmation.capture ? "This action captures the amount approved by the Sandbox buyer. Stock settlement occurs only after PayPal confirmation." : "This action checks PayPal. Stock is deducted only for a captured and confirmed payment.") : "This action changes the order in the Sandbox environment."}</p>{actionError && <p className="inline-error" role="alert">{actionError}</p>}<div className="order-actions"><button className="button secondary" disabled={actionBusy} onClick={() => setConfirmation(null)}>Cancel</button><button className="button primary" disabled={!financialActionsEnabled || actionBusy} onClick={() => void executeAction()}>{actionBusy ? "Processing…" : "Confirm"}</button></div></>}</dialog>
  </div>;
}
function LayersMark() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h9a4 4 0 010 8H9v4M5 7v12M9 7v4h5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
