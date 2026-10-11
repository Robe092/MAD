import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import { operatorSession, csrfValid, assertion, sameOrigin } from "@/lib/operator-auth";
const ALLOWED_ACTIONS = new Set([
    "get_dashboard_state",
    "evaluate_order",
    "ai_copilot_quote",
    "ai_studio_agent",
    "approve_order",
    "reject_order",
    "cancel_order",
    "create_paypal_transaction",
    "create_and_send_invoice",
    "reconcile_payment",
    "verify_payment_status",
]);
const PRIVILEGED_FINANCIAL_ACTIONS = new Set([
    "approve_order",
    "reject_order",
    "create_paypal_transaction",
    "create_and_send_invoice",
    "reconcile_payment",
    "verify_payment_status",
]);
function getEngineConfig(): {
    secret: string;
    webhookUrl: string;
} {
    let secret = process.env.PAYFLOW_ENGINE_SECRET || "";
    let n8nUrl = process.env.N8N_URL || "http://localhost:5678";
    if (!secret) {
        try {
            const rootEnvPath = path.resolve(process.cwd(), "..", ".env");
            if (fs.existsSync(rootEnvPath)) {
                const content = fs.readFileSync(rootEnvPath, "utf-8");
                for (const line of content.split("\n")) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
                        continue;
                    const idx = trimmed.indexOf("=");
                    const key = trimmed.slice(0, idx).trim();
                    const val = trimmed
                        .slice(idx + 1)
                        .trim()
                        .replace(/^['"]|['"]$/g, "");
                    if (key === "PAYFLOW_ENGINE_SECRET" && !secret)
                        secret = val;
                    if (key === "N8N_URL" && val)
                        n8nUrl = val;
                }
            }
        }
        catch {
            // Fallback to defaults if .env cannot be read
        }
    }
    return {
        secret,
        webhookUrl: `${n8nUrl.replace(/\/$/, "")}/webhook/payflow-paypal-engine`,
    };
}
export async function POST(req: NextRequest) {
    try {
        if (!sameOrigin(req, true)) {
            return NextResponse.json({status:"error",code:"ORIGIN_DENIED",message:"Origine de la requête refusée."},{status:403});
        }
        const session = operatorSession(req);
        if (!session) return NextResponse.json({status:"error",code:"OPERATOR_AUTH_REQUIRED",message:"Connectez-vous avec votre compte opérateur."},{status:401});
        if (!csrfValid(req, session)) return NextResponse.json({status:"error",code:"CSRF_DENIED",message:"Session de formulaire expirée. Rechargez la page."},{status:403});
        let body;
        try {
            const raw = await req.text();
            if(raw.length>20000) return NextResponse.json({status:"error",code:"BODY_TOO_LARGE"},{status:413});
            body = JSON.parse(raw);
        }
        catch {
            return NextResponse.json({ status: "error", code: "INVALID_BODY", message: "Requête JSON invalide." }, { status: 400 });
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json({ status: "error", code: "INVALID_BODY", message: "Requête invalide." }, { status: 400 });
        }
        const action = String(body?.action || "evaluate_order").trim();
        if (!ALLOWED_ACTIONS.has(action)) {
            return NextResponse.json({
                status: "error",
                code: "FORBIDDEN_ACTION",
                action,
                message: `Action '${action}' is not permitted by the PayFlow API gateway.`,
            }, { status: 403 });
        }
        if (["ai_copilot_quote", "ai_studio_agent"].includes(action) && (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 6000)) {
            return NextResponse.json({ status: "error", code: "INVALID_PROMPT", message: "Décrivez votre demande en 1 à 6 000 caractères." }, { status: 400 });
        }
        const { secret, webhookUrl } = getEngineConfig();
        if (!secret) {
            return NextResponse.json({ status: "error", code: "SERVER_SECRET_NOT_CONFIGURED", message: "La connexion au service PayFlow n’est pas configurée." }, { status: 503 });
        }
        const cleanBody = { ...body };
        delete cleanBody.operator_key;
        delete cleanBody._internal_secret;
        delete cleanBody.approver_identity;
        for (const key of Object.keys(cleanBody)) if(key.startsWith("_") || ["operator_identity","approval_threshold","simulate_paypal_error","reject_on_tamper"].includes(key)) delete cleanBody[key];
        if (["evaluate_order", "ai_copilot_quote"].includes(action)) {
            cleanBody.order_id = cleanBody.order_id || `ORD-${crypto.randomUUID()}`;
        }
        cleanBody.action = action;
        if (PRIVILEGED_FINANCIAL_ACTIONS.has(action)) cleanBody.approver_identity = session.sub;
        const signedAssertion = assertion(session, cleanBody);
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-PayFlow-Secret": secret,
                "X-PayFlow-Operator-Assertion": signedAssertion,
            },
            body: JSON.stringify(cleanBody),
            cache: "no-store",
            signal: AbortSignal.timeout(90000),
        });
        const data = await res.json().catch(() => ({
            status: "error",
            message: "Invalid JSON response from PayFlow n8n Engine",
        }));
        return NextResponse.json(data, { status: res.status, headers:{"Cache-Control":"no-store"} });
    }
    catch (err: unknown) {
        const message = "Le service PayFlow est momentanément indisponible. Réessayez.";
        return NextResponse.json({ status: "error", code: "PROXY_ERROR", message }, { status: 502 });
    }
}
