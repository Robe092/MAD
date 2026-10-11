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
import type { StudioOrderRow, StudioOrderItemRow, StudioProductRow, StudioOperationRow } from "@/components/PayFlowStudioCanvas";
const Studio = dynamic(() => import("@/components/PayFlowStudioCanvas"), { ssr: false, loading: () => <div className="empty-state loading-state"><RefreshCw className="spin"/><h3>Préparation de vos analyses…</h3><p>Chargement du tableau de bord interactif.</p></div> });
type Space = "overview" | "orders" | "studio" | "catalog" | "audit";
const navigation = [
    { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
    { id: "orders", label: "Commandes", icon: FileText },
    { id: "studio", label: "Analyses IA", icon: BarChart3 },
    { id: "catalog", label: "Catalogue", icon: Package },
] as const;
const titles = { overview: ["Vos ventes, du devis au paiement.", "Préparez un devis avec Gemini. Vérifiez les contrôles. Suivez le paiement PayPal."], orders: ["Chaque commande, sa prochaine étape.", "Retrouvez les devis à examiner, les paiements attendus et les encaissements confirmés."], studio: ["Comprenez ce qui fait avancer vos ventes.", "Posez une question à Gemini, explorez les résultats dans AG Studio."], catalog: ["Votre catalogue, prêt à vendre.", "Prix, disponibilités et marges : les données qui sécurisent chaque devis."], audit: ["Administration / Audit", "Traçabilité des opérations et diagnostics techniques."] };
const filters = [{ id: "ALL", label: "Toutes" }, { id: "PENDING_APPROVAL", label: "À approuver" }, { id: "APPROVED", label: "Validées en interne" }, { id: "AWAITING_PAYMENT", label: "Paiements attendus" }, { id: "INVOICE_SENT", label: "Liens émis" }, { id: "CAPTURED", label: "Payées" }, { id: "SIMULATED", label: "Simulations" }, { id: "BLOCKED_OR_REJECTED", label: "Clôturées / bloquées" }];
const presets = [
    { label: "Devis standard", prompt: "Client: [nom du client] ([email du client]). Commande : 1 caisse de Château Margaux Grand Cru 2018 et 1 caisse de Champagne Brut avec 5% de remise." },
    { label: "Remise à examiner", prompt: "Client: [nom du client] ([email du client]). Commande : 3 caisses de Château Margaux Grand Cru 2018 avec 18% de remise." },
    { label: "Contrôle du stock", prompt: "Client: [nom du client] ([email du client]). Commande : 95 caisses de Rhum Vieux XO." },
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
            if(!response.ok) throw new Error(data.message || "Connexion refusée.");
            setOperator(data.user.username); setLoginOpen(false); void refresh();
        } catch(e) { setLoginError(e instanceof Error ? e.message : "Connexion indisponible."); }
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
                throw new Error("Les données reçues sont incomplètes. Réessayez.");
            setOrders(data.orders);
            setCatalog(data.catalog);
            setOperations(data.operations);
            setLoaded(true);
            setUpdated(new Date());
            setSelected(prev => orderId ? data.orders.find((o: OrderRow) => o.id === orderId) || null : prev ? data.orders.find((o: OrderRow) => o.id === prev.id) || null : null);
        }
        catch (e) {
            setLoadError(e instanceof Error ? e.message : "Impossible de charger votre activité.");
        }
        finally {
            setRefreshing(false);
        }
    }, []);
    useEffect(() => { void fetch("/api/operator",{cache:"no-store"}).then(r=>r.json()).then(data=>{
        if(data.authenticated) {setOperator(data.user.username);void refresh();} else setRefreshing(false);
    }).catch(()=>{setRefreshing(false);setLoadError("Authentification indisponible.");}); }, [refresh]);
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
            } catch(e) {if(!stopped) setTrackingError(e instanceof Error ? e.message : "Vérification PayPal indisponible.");}
            finally {inFlight=false;}
        };
        void verify();
        const timer=window.setInterval(()=>void verify(),30000);
        return ()=>{stopped=true;window.clearInterval(timer);};
    },[operator,selected?.id,selected?.status,selected?.invoice?.paypal_status,refresh]);
    const navigate = (next: Space) => { setSpace(next); setQuery(""); window.location.hash = next; };
    const newQuote = () => { if (!operator) { setLoginOpen(true); return; } navigate("overview"); requestAnimationFrame(() => { promptRef.current?.focus(); promptRef.current?.scrollIntoView({block:"center",behavior:"smooth"}); }); };
    const captured = orders.filter(isCaptured);
    const pending = orders.filter(o => o.status === "PENDING_APPROVAL");
    const awaiting = orders.filter(o => ["APPROVED", "INVOICE_SENT"].includes(o.status));
    const simulated = orders.filter(isSimulated);
    const sum = (rows: OrderRow[]) => rows.reduce((total, o) => total + Number(o.total_amount || 0), 0);
    const filtered = useMemo(() => orders.filter(o => statusFilter === "ALL" || (statusFilter === "CAPTURED" ? isCaptured(o) : statusFilter === "SIMULATED" ? isSimulated(o) : statusFilter === "AWAITING_PAYMENT" ? ["APPROVED", "INVOICE_SENT"].includes(o.status) : statusFilter === "BLOCKED_OR_REJECTED" ? ["BLOCKED_ANOMALY", "REJECTED", "CANCELLED", "OVERDUE"].includes(o.status) : o.status === statusFilter)), [orders, statusFilter]);
    const priority = [...pending, ...orders.filter(o => o.status === "BLOCKED_ANOMALY"), ...awaiting];
    const metrics = [
        { label: "Encaissements confirmés", value: sum(captured), count: `${captured.length} capture${captured.length > 1 ? "s" : ""} PayPal`, icon: ArrowDownLeft, tone: "mint", hint: "Captures PayPal Sandbox confirmées", filter: "CAPTURED" },
        { label: "À approuver", value: sum(pending), count: `${pending.length} commande${pending.length > 1 ? "s" : ""} à examiner`, icon: Clock3, tone: "amber", hint: "Votre validation est nécessaire", filter: "PENDING_APPROVAL" },
        { label: "Paiements attendus", value: sum(awaiting), count: `${awaiting.length} commande${awaiting.length > 1 ? "s" : ""} en cours`, icon: Wallet, tone: "blue", hint: "Commandes validées en interne ou liens émis", filter: "AWAITING_PAYMENT" },
    ];
    const generateQuote = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!prompt.trim() || busy)
            return;
        if (/\[(nom du client|email du client)\]/i.test(prompt)) { setNotice({tone:"warning",title:"Complétez les coordonnées du client",detail:"Remplacez les champs entre crochets par le nom et l’adresse email de votre client avant de préparer le devis."}); promptRef.current?.focus(); return; }
        setBusy(true);
        setNotice(null);
        try {
            if(quoteAttempt.current?.prompt !== prompt.trim()) quoteAttempt.current={prompt:prompt.trim(),id:`ORD-${crypto.randomUUID()}`};
            const { data, httpStatus } = await callPayFlow({ action: "ai_copilot_quote", order_id:quoteAttempt.current.id, prompt: prompt.trim() });
            if (!data.order_id)
                throw new Error(data.message || "Aucun devis n’a été créé. Vérifiez votre demande.");
            await refresh(data.order_id);
            quoteAttempt.current=null;
            const blocked = httpStatus === 422 || data.order_status === "BLOCKED_ANOMALY";
            const fallback = data.llm_proof?.llm_invoked !== true;
            setNotice({ tone: blocked || fallback ? "warning" : data.order_status === "PENDING_APPROVAL" ? "warning" : "success", title: blocked ? "Commande bloquée par les contrôles" : fallback ? "Devis créé en mode de secours" : data.order_status === "PENDING_APPROVAL" ? "Devis prêt à être examiné" : "Devis créé", detail: (data.copilot_explanation || "Les prix, les marges et le stock ont été vérifiés.") + (fallback ? " Gemini n’a pas répondu ; le moteur a utilisé son traitement de secours." : "") });
        }
        catch (e) {
            setNotice({ tone: "error", title: "Le devis n’a pas pu être créé", detail: e instanceof Error ? e.message : "Réessayez dans un instant." });
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
            setNotice({ tone: "success", title: "Opération terminée", detail: data.message || "Le statut de la commande a été actualisé." });
            setConfirmation(null);
        }
        catch (e) {
            setActionError(e instanceof Error ? e.message : "Réessayez.");
            setNotice({ tone: "error", title: "Opération refusée", detail: e instanceof Error ? e.message : "Réessayez." });
        }
        finally {
            setActionBusy(false);
        }
    };
    const orderColumns = useMemo<ColDef<OrderRow>[]>(() => [
        { field: "quote_number", headerName: "Commande", minWidth: 240, flex: 1, cellRenderer: (p: ICellRendererParams<OrderRow>) => <div className="grid-stack"><strong>{p.value}</strong><small>{p.data ? new Date(p.data.created_at).toLocaleDateString("fr-FR") : ""}</small></div> },
        { field: "customer_company", headerName: "Client", minWidth: 280, flex: 1.6, cellRenderer: (p: ICellRendererParams<OrderRow>) => <div className="grid-stack"><strong>{p.value || p.data?.customer_name}</strong><small>{p.data?.customer_email}</small></div> },
        { field: "total_amount", headerName: "Montant", minWidth: 130, flex: 1, cellDataType: "number", valueGetter: p => Number(p.data?.total_amount || 0), valueFormatter: p => money(p.value) },
        { field: "computed_margin_pct", headerName: "Marge", width: 100, cellDataType: "number", valueGetter: p => Number(p.data?.computed_margin_pct || 0), valueFormatter: p => `${Number(p.value).toFixed(1)} %` },
        { field: "status", headerName: "Statut", minWidth: 200, flex: 1.2, valueFormatter: p => p.data ? settlementLabel(p.data) : "", getQuickFilterText: p => p.data ? settlementLabel(p.data) : "", cellRenderer: (p: ICellRendererParams<OrderRow>) => p.data ? <Status order={p.data}/> : null },
        { headerName: "", width: 110, pinned: "right", lockPinned: true, sortable: false, filter: false, cellRenderer: (p: ICellRendererParams<OrderRow>) => <button className="grid-open" aria-label={`Voir ${p.data?.quote_number}`} onClick={() => setSelected(p.data || null)}>Voir <ChevronRight size={14}/></button> },
    ], []);
    const catalogColumns = useMemo<ColDef<ProductRow>[]>(() => [
        { field: "name", headerName: "Produit", minWidth: 290, flex: 2, cellRenderer: (p: ICellRendererParams<ProductRow>) => <div className="grid-stack"><strong>{p.value}</strong><small>{p.data?.sku}</small></div> },
        { field: "category", headerName: "Catégorie", minWidth: 140, flex: 1, valueFormatter: p => ({ PRESTIGE_WINE: "Vins de prestige", CHAMPAGNE: "Champagne", WHITE_WINE: "Vins blancs", SPIRITS: "Spiritueux" } as Record<string, string>)[p.value] || p.value },
        { field: "unit_price", headerName: "Prix", width: 125, cellDataType: "number", valueGetter: p => Number(p.data?.unit_price || 0), valueFormatter: p => money(p.value) },
        { field: "stock_on_hand", headerName: "Stock physique", width: 145, cellDataType: "number", valueGetter: p => Number(p.data?.stock_on_hand || 0) },
        { field: "stock_reserved", headerName: "Stock réservé", width: 145, cellDataType: "number", valueGetter: p => Number(p.data?.stock_reserved || 0) },
        { field: "available_stock", headerName: "Disponible", width: 125, cellDataType: "number", valueGetter: p => Number(p.data?.available_stock || 0), cellClass: "stock-available" },
        { headerName: "Marge catalogue", width: 165, cellDataType: "number", valueGetter: p => p.data && Number(p.data.unit_price) > 0 ? (1 - Number(p.data.unit_cost) / Number(p.data.unit_price)) * 100 : 0, valueFormatter: p => `${Number(p.value).toFixed(1)} %` },
    ], []);
    const auditColumns: ColDef<OperationRow>[] = [{ field: "order_id", headerName: "Commande", minWidth: 190 }, { field: "operation_type", headerName: "Opération", minWidth: 170 }, { field: "status", headerName: "État", width: 140 }, { field: "attempt_count", headerName: "Tentatives", width: 115 }, { field: "http_status", headerName: "HTTP", width: 90 }, { field: "paypal_request_id", headerName: "Clé d’idempotence", minWidth: 260 }, { field: "last_error", headerName: "Dernière erreur", minWidth: 220 }];
    const studioOrders = useMemo<StudioOrderRow[]>(() => orders.map(o => ({ ...o, customer_company:o.customer_company || o.customer_name, subtotal_amount: Number(o.subtotal_amount || 0), discount_amount: Number(o.discount_amount || 0), total_amount: Number(o.total_amount || 0), total_cost_amount: Number(o.total_cost_amount || 0), computed_margin_pct: Number(o.computed_margin_pct || 0), settlement_label: settlementLabel(o), requires_hitl: Boolean(o.requires_hitl) })), [orders]);
    const studioItems = useMemo<StudioOrderItemRow[]>(() => orders.flatMap(o => (o.items || []).map(it => ({ id: `${o.id}-${it.id}`, order_id: o.id, sku: it.sku, product_name: it.product_name, quantity: Number(it.quantity || 0), applied_unit_price: Number(it.applied_unit_price || 0), discount_pct: Number(it.discount_pct || 0), line_total: Number(it.line_total || 0), line_margin_pct: Number(it.line_margin_pct || 0) }))), [orders]);
    const studioProducts = useMemo<StudioProductRow[]>(() => catalog.map(p => ({ ...p, unit_price: Number(p.unit_price), unit_cost: Number(p.unit_cost), stock_on_hand: Number(p.stock_on_hand), stock_reserved: Number(p.stock_reserved), available_stock: Number(p.available_stock), max_discount_pct: Number(p.max_discount_pct), min_margin_pct: Number(p.min_margin_pct) })), [catalog]);
    const studioOperations = useMemo<StudioOperationRow[]>(() => operations.map(op => ({ ...op, attempt_count: Number(op.attempt_count), http_status: Number(op.http_status), paypal_resource_id: op.paypal_resource_id || "" })), [operations]);
    const nextStep = selected ? nextOrderStep(selected) : null;
    return <div className="app-shell">
    <a className="skip-link" href="#main-content">Aller au contenu</a>
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => navigate("overview")}><span className="brand-mark"><LayersMark /></span><span>PayFlow<span className="brand-ai">AI</span></span></a>
      <div className="workspace"><span className="workspace-avatar">P</span><div><strong>Espace entreprise</strong><small>Commerce B2B</small></div><ShieldCheck size={16}/></div>
      <span className="nav-caption">ESPACE DE TRAVAIL</span>
      <nav aria-label="Navigation principale">{navigation.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-label={label} aria-current={space === id ? "page" : undefined} onClick={() => navigate(id)} className={`nav-link ${space === id ? "active" : ""}`}><Icon size={19}/>{label}{id === "orders" && loaded && <span className="nav-count" aria-hidden="true">{orders.length}</span>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="sandbox-card"><span className="sandbox-dot"/><strong>PayPal Sandbox</strong><p>Environnement de démonstration</p></div><a href="#audit" className={`nav-link ${space === "audit" ? "active" : ""}`} onClick={() => navigate("audit")}><ShieldCheck size={18}/>Administration / Audit</a><div className="operator"><span className="operator-avatar"><LockKeyhole size={17}/></span><div><strong>{operator ? "Opérateur connecté" : "Session requise"}</strong><small>{operator ? "Actions autorisées et tracées" : "Actions financières protégées"}</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Espace entreprise <ChevronRight size={14}/><span>{space === "audit" ? "Audit" : navigation.find(n=>n.id===space)?.label}</span></div><div className="topbar-right"><span className="environment"><span/>PayPal Sandbox</span><button className="button secondary" onClick={()=>operator ? void logout() : setLoginOpen(true)}>{operator ? "Déconnexion" : "Se connecter"}</button></div></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">PAYFLOW AI / {space === "overview" ? "VOTRE ACTIVITÉ" : "ESPACE ENTREPRISE"}</div><h1>{titles[space][0]}</h1><p>{titles[space][1]}</p></div><div className="heading-actions"><button className="button secondary icon-button" disabled={!operator || refreshing} onClick={() => void refresh()} aria-label="Actualiser les données"><RefreshCw size={17} className={refreshing ? "spin" : ""}/></button>{space !== "overview" && <button className="button primary" onClick={newQuote}><Sparkles size={17}/>Nouveau devis</button>}</div></div>
        {!operator && <section className="welcome-panel" aria-labelledby="welcome-title"><div className="welcome-copy"><span className="eyebrow">VOTRE ESPACE COMMERCIAL</span><h2 id="welcome-title">Une demande. Un devis vérifié.<br/>Un paiement suivi.</h2><p>Gemini prépare vos devis à partir des demandes clients. PayFlow contrôle les stocks, les remises et les marges. PayPal prend le relais pour le paiement.</p><button className="button primary" onClick={()=>setLoginOpen(true)}><LockKeyhole size={17}/>Accéder à mon espace <ArrowRight size={17}/></button><small>Vos données et vos actions sont protégées par votre session opérateur.</small></div><div className="welcome-steps"><div><span>01</span><h3>Préparez le devis</h3><p>Décrivez le client, les produits et les quantités à Gemini.</p></div><div><span>02</span><h3>Gardez le contrôle</h3><p>Examinez les vérifications et validez les commandes qui le nécessitent.</p></div><div><span>03</span><h3>Suivez le paiement</h3><p>Retrouvez l’état PayPal et analysez votre activité dans AG Studio.</p></div></div></section>}
        {operator && <>
        {loadError && <div className="notice error" role="alert"><AlertTriangle /><div><strong>{loaded ? "Actualisation indisponible" : "Connexion indisponible"}</strong><p>{loadError}{loaded ? " Les dernières données restent affichées." : " Aucun montant ne peut être confirmé pour le moment."}</p></div><button className="button secondary" onClick={() => void refresh()}>Réessayer</button></div>}
        {notice && <div className={`notice ${notice.tone}`} role="status"><CheckCircle2 /><div><strong>{notice.title}</strong><p>{notice.detail}</p></div><button className="close-button" aria-label="Fermer le message" onClick={() => setNotice(null)}><X size={18}/></button></div>}
        {space === "overview" && <>
          <div className="quote-workspace">            <section className="panel assistant-panel"><div className="panel-heading"><div className="assistant-title"><span className="assistant-icon"><Sparkles size={20}/></span><div><h2>Préparez votre prochain devis</h2><p>Décrivez la demande. Gemini prépare le devis, PayFlow le vérifie.</p></div></div><span className="ai-label">GEMINI</span></div><form onSubmit={generateQuote}><label htmlFor="quote-prompt">Quelle est la demande de votre client ?</label><textarea id="quote-prompt" ref={promptRef} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Client : nom et email. Puis les produits, quantités et la remise souhaitée…" aria-describedby="quote-help" required maxLength={6000} disabled={busy}/><div className="assistant-submit"><span><ShieldCheck size={15}/>Prix, marges et stocks vérifiés</span><button className="button primary" disabled={!financialActionsEnabled || !prompt.trim() || busy} type="submit">{busy ? <><RefreshCw size={16} className="spin"/>Analyse en cours…</> : <>Préparer le devis <ArrowRight size={16}/></>}</button></div><p id="quote-help" className="form-help">Indiquez le <strong>nom et l’email du client</strong>, les produits, les quantités et la remise.</p><div className="prompt-examples"><span>Modèles à compléter</span>{presets.map(p => <button type="button" disabled={busy} key={p.label} onClick={() => { setPrompt(p.prompt); promptRef.current?.focus(); }}>{p.label}</button>)}</div></form></section><section className="sales-guide" aria-labelledby="sales-guide-title"><span className="eyebrow">COMMENT ÇA MARCHE</span><h2 id="sales-guide-title">Du besoin client <br/>au paiement confirmé.</h2><ol><li><span>01</span><div><strong>Le devis, avec Gemini</strong><p>L’IA transforme votre demande en produits, quantités et prix.</p></div></li><li><span>02</span><div><strong>Les contrôles, avec PayFlow</strong><p>Stocks, marges et remises sont vérifiés. Vous validez si nécessaire.</p></div></li><li><span>03</span><div><strong>Le paiement, avec PayPal</strong><p>Créez le lien, puis suivez l’autorisation et la capture du paiement.</p></div></li></ol><div className="guide-footer"><ShieldCheck size={18}/><p>Vous gardez la main sur les validations et les captures.</p></div></section></div>
          <div className="metrics">{metrics.map(({ label, value, count, icon: Icon, tone, hint, filter }) => <button className="metric" key={label} onClick={() => { setStatusFilter(filter); navigate("orders"); }}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={19}/></span></div><div className="metric-value">{loaded ? money(value) : "—"}</div><div className="metric-bottom"><span className={`mini-dot ${tone}`}/>{loaded ? count : refreshing ? "Chargement de l’activité…" : "Données indisponibles"}</div><small>{hint}</small></button>)}</div>
          <div className="activity-heading"><div><span className="eyebrow">VOTRE ACTIVITÉ</span><h2>Gardez une longueur d’avance.</h2></div><button className="text-button" onClick={()=>navigate("studio")}>Explorer dans AG Studio <ArrowRight size={16}/></button></div>
            <section className="panel priorities"><div className="panel-heading"><div><h2>À faire maintenant <span className="count-pill">{loaded ? priority.length : "—"}</span></h2><p>Ouvrez une commande pour passer à l’étape suivante.</p></div><span className="small-icon"><Clock3 size={19}/></span></div>
              {!loaded ? <Empty title={refreshing ? "Chargement de vos commandes…" : "Votre activité n’est pas disponible"} detail="Les actions prioritaires apparaîtront ici."/> : priority.length === 0 ? <Empty title="Tout est à jour" detail="Aucune commande ne demande votre attention."/> : <div className="priority-list">{priority.slice(0, 4).map(o => <button className="priority-row" key={o.id} onClick={() => setSelected(o)}><span className={`priority-icon ${o.status === "PENDING_APPROVAL" ? "amber" : "blue"}`}>{o.status === "PENDING_APPROVAL" ? <Clock3 size={19}/> : <FileText size={19}/>}</span><span className="priority-copy"><strong>{o.customer_company || o.customer_name}</strong><small>{o.status === "PENDING_APPROVAL" ? "Validation interne requise" : o.status === "BLOCKED_ANOMALY" ? "Une anomalie est à examiner" : o.status === "APPROVED" ? "Prête pour un lien de paiement" : "En attente du paiement acheteur"}</small></span><span className="priority-amount">{money(o.total_amount)}<small>{o.quote_number}</small></span><ChevronRight size={17}/></button>)}</div>}
              <button className="text-button panel-footer" onClick={() => { setStatusFilter("ALL"); navigate("orders"); }}>Voir toutes les commandes <ArrowRight size={16}/></button>
            </section>
          <section className="panel recent-panel"><div className="panel-heading"><div><h2>Dernières commandes</h2><p>Suivez les mouvements de votre activité.</p></div><button className="text-button" onClick={() => { setStatusFilter("ALL"); navigate("orders"); }}>Toutes les commandes <ArrowRight size={16}/></button></div>{loaded && orders.length > 0 ? <div className="table-scroll"><table className="business-table"><thead><tr><th>Commande</th><th>Client</th><th>Montant</th><th>Marge</th><th>Statut</th><th><span className="sr-only">Détail</span></th></tr></thead><tbody>{orders.slice(0, 4).map(o => <tr key={o.id}><td><button className="order-link" onClick={() => setSelected(o)}>{o.quote_number}</button><small>{new Date(o.created_at).toLocaleDateString("fr-FR")}</small></td><td><strong>{o.customer_company || o.customer_name}</strong><small>{o.customer_name || o.customer_email}</small></td><td className="amount">{money(o.total_amount)}</td><td>{Number(o.computed_margin_pct).toFixed(1)} %</td><td><Status order={o}/></td><td><button className="close-button" aria-label={`Ouvrir ${o.quote_number}`} onClick={() => setSelected(o)}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div> : <Empty title={refreshing ? "Chargement des commandes…" : "Aucune commande à afficher"} detail="Créez un devis avec l’assistant pour commencer."/>}<p className="table-scroll-hint">Faites défiler horizontalement pour voir toutes les colonnes.</p></section>
          <div className="overview-footnote"><span><ShieldCheck size={15}/>Encaissements : captures confirmées dans l’environnement Sandbox.</span>{simulated.length > 0 && <span>{simulated.length} paiement simulé · {money(sum(simulated))} · exclu des encaissements</span>}</div>
        </>}
        {space === "orders" && <div className="section-context"><ShieldCheck size={21}/><p><strong>Une action adaptée à chaque statut.</strong> Ouvrez un devis pour examiner les contrôles, préparer son lien PayPal ou retrouver la preuve du paiement.</p></div>}
        {space === "catalog" && <div className="stock-guide">{[{label:"Physique",field:"stock_on_hand" as const,Icon:Package,detail:"unités présentes"},{label:"Réservé",field:"stock_reserved" as const,Icon:LockKeyhole,detail:"unités retenues"},{label:"Disponible",field:"available_stock" as const,Icon:CheckCircle2,detail:"unités disponibles"}].map(({label,field,Icon,detail})=><div key={field}><Icon size={20}/><strong>{label}</strong><span className="stock-total">{loaded ? catalog.reduce((total,p)=>total+Number(p[field] || 0),0).toLocaleString("fr-FR") : "—"}</span><p>{detail} · {loaded ? catalog.length : "—"} références du catalogue</p></div>)}</div>}
        {(space === "orders" || space === "catalog" || space === "audit") && <section className="panel data-panel"><div className="panel-heading"><div><h2>{space === "orders" ? "Vos commandes" : space === "catalog" ? "Produits & stocks" : "Journal des opérations"} <span className="count-pill">{loaded ? (space === "orders" ? orders.length : space === "catalog" ? catalog.length : operations.length) : "—"}</span></h2><p>{space === "catalog" ? "Disponible = stock physique − stock réservé." : space === "orders" ? "Sélectionnez une commande pour consulter ses produits et ses contrôles." : "Opérations PayPal, tentatives et réponses du service."}</p></div>{space === "orders" && <button className="button secondary" disabled={!loaded} onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: "payflow-commandes.csv" })}><Download size={16}/>Exporter</button>}</div>
          <div className="data-toolbar">{space === "orders" && <div className="filter-tabs" aria-label="Filtrer par statut">{filters.map(f => <button key={f.id} aria-pressed={statusFilter === f.id} className={statusFilter === f.id ? "selected" : ""} onClick={() => setStatusFilter(f.id)}>{f.label}</button>)}</div>}<label className="search-input"><Search size={17}/><input aria-label={space === "orders" ? "Rechercher une commande" : space === "catalog" ? "Rechercher un produit" : "Rechercher une opération"} value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…"/></label></div>
          {!loaded ? <Empty title={refreshing ? "Chargement des données…" : "Données indisponibles"} detail="Actualisez la page pour réessayer."/> : <div className="ag-theme-quartz payflow-grid" style={{ height: 560 }}>{space === "orders" ? <AgGridReact<OrderRow> key="orders" ref={gridRef} rowData={filtered} columnDefs={orderColumns} quickFilterText={query} onFilterChanged={event => event.api.getDisplayedRowCount() === 0 ? event.api.showNoRowsOverlay() : event.api.hideOverlay()} rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }} onRowClicked={e => e.data && setSelected(e.data)} defaultColDef={{ sortable: true, filter: true, resizable: true }} rowHeight={84} headerHeight={46} overlayNoRowsTemplate="Aucune commande ne correspond à vos filtres."/> : space === "catalog" ? <AgGridReact<ProductRow> key="catalog" rowData={catalog} columnDefs={catalogColumns} quickFilterText={query} onFilterChanged={event => event.api.getDisplayedRowCount() === 0 ? event.api.showNoRowsOverlay() : event.api.hideOverlay()} defaultColDef={{ sortable: true, filter: true, resizable: true }} rowHeight={68} headerHeight={46} overlayNoRowsTemplate="Aucun produit à afficher."/> : <AgGridReact<OperationRow> key="audit" rowData={operations} columnDefs={auditColumns} quickFilterText={query} onFilterChanged={event => event.api.getDisplayedRowCount() === 0 ? event.api.showNoRowsOverlay() : event.api.hideOverlay()} defaultColDef={{ sortable: true, filter: true, resizable: true }} rowHeight={56} headerHeight={46} overlayNoRowsTemplate="Aucune opération à afficher."/>}</div>}
          <p className="table-scroll-hint">Faites défiler horizontalement pour voir toutes les colonnes.</p><div className="data-footer"><span>{space === "orders" ? "Les encaissements confirmés et les simulations disposent de filtres distincts." : space === "catalog" ? "La marge catalogue est calculée avant remise et taxes." : "Les journaux sont conservés par le moteur PayFlow."}</span><span>Source : PayFlow</span></div>
        </section>}
        {space === "studio" && (loaded ? <Studio key={orders.map(o=>`${o.id}:${o.updated_at || o.status}:${o.total_amount}`).join("|")} orders={studioOrders} orderItems={studioItems} products={studioProducts} operations={studioOperations} summary={{ total_orders: orders.length, pending_hitl_count: pending.length, approved_count: orders.filter(o => o.status === "APPROVED").length, invoice_sent_count: orders.filter(o => o.status === "INVOICE_SENT").length, paid_orders_count: captured.length, paid_revenue_usd: sum(captured), simulated_test_paid_count: simulated.length, simulated_test_paid_usd: sum(simulated), pipeline_revenue_usd: sum(awaiting), average_margin_pct: orders.length ? orders.reduce((s, o) => s + Number(o.computed_margin_pct || 0), 0) / orders.length : 0 }} onApplyStatusFilter={setStatusFilter}/> : <Empty title={refreshing ? "Chargement des sources d’analyse…" : "Analyses indisponibles"} detail="Les graphiques seront affichés après réception des données."/>)}
        {space === "audit" && <section className="panel audit-note"><LockKeyhole /><div><h2>Protection des actions financières</h2><p>L’approbation, le refus, l’émission PayPal et la réconciliation nécessitent une session opérateur vérifiée côté serveur. Les décisions sont signées et tracées ; aucune clé serveur n’est envoyée au navigateur.</p><p>AG Studio 3.0 utilise quatre sources reliées : commandes, lignes de commande, produits et opérations. Les fonctions Pro avec IA nécessitent une licence pour retirer le filigrane d’essai.</p></div></section>}
        </>}
        <footer className="page-footer"><span>PayFlow AI <span className="footer-separator">/</span> Commerce sous contrôle <a className="mobile-audit" href="#audit" onClick={() => navigate("audit")}>Administration / Audit</a></span><span aria-live="polite">{refreshing ? "Actualisation en cours…" : updated ? `Actualisé à ${updated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : "En attente de connexion"}</span></footer>
      </main>
    </div>
    <dialog ref={loginRef} className="confirm-dialog" aria-labelledby="login-title" onCancel={()=>setLoginOpen(false)} onClose={()=>setLoginOpen(false)}>
      <form onSubmit={login}><span className="login-symbol"><LockKeyhole size={24}/></span><h2 id="login-title">Bienvenue dans PayFlow.</h2><p>Connectez-vous pour préparer vos devis et suivre les paiements.</p><label htmlFor="operator-username">Identifiant</label><input id="operator-username" name="username" autoComplete="username" required maxLength={128}/><label htmlFor="operator-password">Mot de passe</label><input id="operator-password" name="password" type="password" autoComplete="current-password" required maxLength={256}/>{loginError && <p role="alert">{loginError}</p>}<div className="order-actions"><button type="button" className="button secondary" onClick={()=>setLoginOpen(false)}>Annuler</button><button className="button primary" disabled={loginBusy} type="submit">{loginBusy ? "Connexion…" : "Se connecter"}</button></div></form>
    </dialog>
    <dialog ref={dialogRef} className="order-dialog" aria-labelledby="order-dialog-title" onCancel={() => setSelected(null)} onClose={() => setSelected(null)}>{selected && <>
      <div className="dialog-heading"><div><span className="eyebrow">FICHE COMMANDE</span><h2 id="order-dialog-title">{selected.quote_number}</h2><Status order={selected}/></div><button className="close-button" aria-label="Fermer la commande" onClick={() => setSelected(null)}><X /></button></div>
      <ol className="order-journey" aria-label="Progression de la commande">{orderJourney(selected).map((step,i)=><li key={step.title} className={step.state} aria-current={step.state === "current" ? "step" : undefined}><span>{step.state === "done" ? <Check size={15}/> : i+1}</span><div><strong>{step.title}</strong><small>{({done:"Confirmé",current:"Étape en cours",waiting:"À venir",stop:"Interrompu"} as Record<string,string>)[step.state]}</small></div></li>)}</ol>
      {nextStep && <div className={`next-step ${nextStep.tone}`}><div className="eyebrow">{isCaptured(selected) ? "COMMANDE RÉGLÉE" : "PROCHAINE ÉTAPE"}</div><h3>{nextStep.title}</h3><p>{nextStep.detail}</p></div>}
      <div className="order-summary"><div><small>CLIENT</small><h3>{selected.customer_company || selected.customer_name}</h3><p>{selected.customer_name}</p><p>{selected.customer_email}</p></div><div><small>MONTANT TOTAL</small><strong>{money(selected.total_amount)}</strong><p>Marge : {Number(selected.computed_margin_pct).toFixed(1)} %</p><p>Remise : {money(selected.discount_amount)}</p></div></div>
      {(selected.anomaly_flags || []).length > 0 ? <div className="order-anomalies"><h3><AlertTriangle size={17}/>Comprendre les contrôles</h3><ul className="control-explanations">{selected.anomaly_flags.map((a, i) => { const explanation = explainControl(a, selected); return <li key={i}><strong>{explanation.title}</strong><span className="control-subject">{explanation.subject}</span><p>{explanation.detail}</p><p className="control-guidance">{explanation.guidance}</p></li>; })}</ul></div> : <div className="control-ok"><Check size={17}/>Aucune anomalie signalée par les contrôles</div>}
      <h3 className="detail-label">Produits de la commande</h3><div className="table-scroll"><table className="business-table detail-table"><thead><tr><th>Produit</th><th>Qté</th><th>Prix appliqué</th><th>Remise</th><th>Marge</th><th>Réservé</th><th>Total</th></tr></thead><tbody>{(selected.items || []).map(it => <tr key={it.id}><td><strong>{it.product_name}</strong><small>{it.sku}</small></td><td>{it.quantity}</td><td>{money(it.applied_unit_price)}</td><td>{Number(it.discount_pct).toFixed(1)} %</td><td>{Number(it.line_margin_pct).toFixed(1)} %</td><td>{it.stock_reserved_qty}</td><td>{money(it.line_total)}</td></tr>)}</tbody></table></div>
      <div className="payment-detail"><h3>Du devis au paiement</h3><p><strong>Validation interne :</strong> {selected.status === "PENDING_APPROVAL" ? "requise" : ["APPROVED","INVOICE_SENT","PAID"].includes(selected.status) ? "effectuée" : settlementLabel(selected)}.</p><p><strong>Acceptation commerciale du devis :</strong> non enregistrée dans ce parcours. La validation interne ne constitue pas un accord du client.</p><p><strong>Autorisation de paiement acheteur :</strong> {orderJourney(selected)[2].state === "done" ? "confirmée par PayPal" : "non confirmée"}.</p><p>{isSimulated(selected) ? "Transaction simulée : aucun encaissement PayPal confirmé." : isCaptured(selected) ? "Capture confirmée par PayPal Sandbox." : selected.invoice ? "La transaction est émise. Le paiement reste à confirmer." : "Aucune transaction PayPal n’a été émise."}</p>{selected.invoice && <dl><div><dt>État PayPal</dt><dd>{selected.invoice.paypal_status}</dd></div><div><dt>Référence</dt><dd>{selected.invoice.paypal_invoice_id}</dd></div><div><dt>Capture</dt><dd>{selected.invoice.capture_id || "Non confirmée"}</dd></div></dl>}{selected.invoice && <p>Dernière vérification : {selected.invoice.last_reconciled_at ? new Date(selected.invoice.last_reconciled_at).toLocaleString("fr-FR") : "non effectuée"}. {!isCaptured(selected) && !isSimulated(selected) && !["CANCELLED","OVERDUE"].includes(selected.status) ? "Suivi automatique tant que cette fiche reste ouverte." : "Dernier état confirmé conservé."}</p>}{trackingError && <p role="alert">{trackingError} Le dernier état confirmé est conservé.</p>}</div>
      {!operator && <div className="locked-notice"><LockKeyhole size={18}/><span>Connectez-vous comme opérateur pour effectuer une action financière.</span></div>}<div className="order-actions">
        {selected.status === "PENDING_APPROVAL" && <><button className="button primary" disabled={!financialActionsEnabled || actionBusy || !selected.approval?.approval_token} onClick={() => setConfirmation({ action: "approve_order", label: "Valider la commande en interne", order: selected })}>Valider en interne</button><button className="button secondary" disabled={!financialActionsEnabled || actionBusy || !selected.approval?.approval_token} onClick={() => setConfirmation({ action: "reject_order", label: "Refuser et libérer le stock", order: selected })}>Refuser</button></>}
        {!selected.invoice && ["DRAFT","PENDING_APPROVAL","APPROVED"].includes(selected.status) && <button className="button secondary" disabled={!financialActionsEnabled || actionBusy} onClick={()=>setConfirmation({action:"cancel_order",label:"Abandonner ce devis et libérer le stock",order:selected})}>Abandonner le devis</button>}
        {selected.status === "APPROVED" && !selected.invoice && <button className="button primary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action: "create_paypal_transaction", label: "Créer le lien PayPal Sandbox", order: selected, channel: "ORDERS_V2" })}>Créer le lien PayPal</button>}
        {selected.invoice?.recipient_view_url && /^https:\/\/([a-z0-9-]+\.)*sandbox\.paypal\.com\//i.test(selected.invoice.recipient_view_url) && !isSimulated(selected) && !["PAID","CANCELLED","OVERDUE"].includes(selected.status) && <a href={selected.invoice.recipient_view_url} target="_blank" rel="noopener noreferrer" className="button secondary">Ouvrir le paiement PayPal <ArrowUpRight size={15}/></a>}
        {selected.invoice?.resource_type === "PAYPAL_ORDER_V2" && selected.invoice.paypal_status === "APPROVED" && <button className="button primary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action:"reconcile_payment",label:"Capturer le paiement approuvé",order:selected,capture:true })}>Capturer le paiement</button>}
        {selected.invoice?.paypal_invoice_id && <button className="button secondary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action: "reconcile_payment", label: "Vérifier et réconcilier le paiement", order: selected })}>Actualiser l’état PayPal</button>}
      </div><details className="technical-details"><summary>Traçabilité & diagnostic</summary><p>Commande : {selected.id}</p><p>Contrôles : {selected.control_summary}</p>{(selected.anomaly_flags || []).length > 0 && <><p>Messages d’origine du moteur :</p><ul>{selected.anomaly_flags.map((a, i) => <li key={i}><code>{a.code}</code><p>{a.message}</p></li>)}</ul></>}<p>Approbation : {selected.approval?.status || "Non requise"}</p><p>Expiration : {selected.approval?.expires_at || "—"}</p>{selected.status === "APPROVED" && !selected.invoice && <button className="button secondary" disabled={!financialActionsEnabled || actionBusy} onClick={() => setConfirmation({ action: "create_paypal_transaction", label: "Émettre une facture Sandbox", order: selected, channel: "INVOICING_V2" })}>Émettre une facture Sandbox (diagnostic)</button>}</details>
    </>}</dialog>
    <dialog className="confirm-dialog" aria-labelledby="confirm-dialog-title" ref={confirmRef} onCancel={() => setConfirmation(null)} onClose={() => setConfirmation(null)}>{confirmation && <><h2 id="confirm-dialog-title">{confirmation.label} ?</h2><p>{confirmation.order.customer_company || confirmation.order.customer_name} · {confirmation.order.quote_number}</p><strong>{money(confirmation.order.total_amount)}</strong><p>{confirmation.action === "cancel_order" ? "Le devis sera annulé et le stock réservé sera libéré." : confirmation.action === "reject_order" ? "La commande sera refusée et le stock réservé sera libéré." : confirmation.action === "reconcile_payment" ? (confirmation.capture ? "Cette action capture le montant approuvé par l’acheteur Sandbox. Le stock sera réglé uniquement après confirmation PayPal." : "Cette action vérifie PayPal. Le stock sera déduit uniquement pour un paiement déjà capturé et confirmé.") : "Cette action modifiera la commande dans l’environnement Sandbox."}</p>{actionError && <p className="inline-error" role="alert">{actionError}</p>}<div className="order-actions"><button className="button secondary" disabled={actionBusy} onClick={() => setConfirmation(null)}>Annuler</button><button className="button primary" disabled={!financialActionsEnabled || actionBusy} onClick={() => void executeAction()}>{actionBusy ? "Traitement…" : "Confirmer"}</button></div></>}</dialog>
  </div>;
}
function LayersMark() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h9a4 4 0 010 8H9v4M5 7v12M9 7v4h5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
