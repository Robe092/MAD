-- =============================================================================
-- PayFlow AI (PayPal AI Hackathon 2026) — Isolated 7-Table Schema & Constraints
-- Zero impact on existing tables (docubridge_*, rh_*, vinistoria_*)
-- =============================================================================

-- 1. Catalogue Produits, Coûts, Seuils de Marge/Remise & Réservation de Stock
CREATE TABLE IF NOT EXISTS payflow_products (
    id VARCHAR(64) PRIMARY KEY,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'B2B_CATALOG',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    min_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (min_margin_pct >= 0 AND min_margin_pct <= 100),
    max_discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (max_discount_pct >= 0 AND max_discount_pct <= 100),
    stock_on_hand INT NOT NULL DEFAULT 0 CHECK (stock_on_hand >= 0),
    stock_reserved INT NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payflow_stock_reservation CHECK (stock_reserved <= stock_on_hand)
);

-- 2. Commandes & Devis Clients (État commercial & Résultat des contrôles déterministes)
CREATE TABLE IF NOT EXISTS payflow_orders (
    id VARCHAR(64) PRIMARY KEY,
    quote_number VARCHAR(64) UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_company TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_rate_pct >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    total_cost_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost_amount >= 0),
    computed_margin_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    payment_channel VARCHAR(32) NOT NULL DEFAULT 'INVOICING_V2' CHECK (payment_channel IN ('INVOICING_V2', 'ORDERS_V2')),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT',
            'BLOCKED_ANOMALY',
            'PENDING_APPROVAL',
            'APPROVED',
            'INVOICE_DRAFT_CREATED',
            'INVOICE_SENT',
            'PAID',
            'OVERDUE',
            'CANCELLED',
            'REJECTED'
        )
    ),
    requires_hitl BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    control_summary TEXT,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Lignes de Commandes Figées (Snapshots de prix, coût, remise et stock réservé)
CREATE TABLE IF NOT EXISTS payflow_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES payflow_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES payflow_products(id),
    sku VARCHAR(64) NOT NULL,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    catalog_unit_price NUMERIC(12, 2) NOT NULL CHECK (catalog_unit_price >= 0),
    unit_cost_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_cost_snapshot >= 0),
    applied_unit_price NUMERIC(12, 2) NOT NULL CHECK (applied_unit_price >= 0),
    discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
    line_margin_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    stock_reserved_qty INT NOT NULL DEFAULT 0 CHECK (stock_reserved_qty >= 0),
    line_anomalies JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payflow_order_items_order_id ON payflow_order_items(order_id);

-- 4. Approbations Humaines HITL Atomiques (Anti-rejeu & Traçabilité)
CREATE TABLE IF NOT EXISTS payflow_approvals (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES payflow_orders(id) ON DELETE CASCADE,
    approval_token VARCHAR(128) UNIQUE NOT NULL,
    reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    proposal_snapshot JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED_CONSUMED', 'REJECTED_CONSUMED', 'EXPIRED')
    ),
    approver_identity VARCHAR(128),
    decision_notes TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payflow_approvals_order_status ON payflow_approvals(order_id, status);

-- 4b. Configuration & Authentification Webhook (Hash SHA-256 sans secret en clair)
CREATE TABLE IF NOT EXISTS payflow_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Factures & Commandes PayPal Sandbox (Distinction explicite INVOICE_V2 vs ORDER_V2)
CREATE TABLE IF NOT EXISTS payflow_invoices (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES payflow_orders(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL DEFAULT 'PAYPAL_INVOICE_V2' CHECK (
        resource_type IN ('PAYPAL_INVOICE_V2', 'PAYPAL_ORDER_V2')
    ),
    paypal_invoice_id VARCHAR(128) UNIQUE,
    paypal_invoice_number VARCHAR(64),
    paypal_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (
        paypal_status IN (
            'DRAFT',
            'SENT',
            'SCHEDULED',
            'PAID',
            'MARKED_AS_PAID',
            'PARTIALLY_PAID',
            'CANCELLED',
            'REFUNDED',
            'PAYMENT_PENDING',
            'CREATED',
            'PAYER_ACTION_REQUIRED',
            'APPROVED',
            'COMPLETED'
        )
    ),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    payee_merchant_id VARCHAR(128),
    capture_id VARCHAR(128),
    recipient_email TEXT NOT NULL,
    recipient_view_url TEXT,
    invoicer_view_url TEXT,
    due_date DATE,
    nudge_count INT NOT NULL DEFAULT 0 CHECK (nudge_count >= 0),
    last_nudged_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    last_reconciled_at TIMESTAMPTZ,
    raw_paypal_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Journal des Opérations de Paiement & Clés d'Idempotence (PayPal-Request-Id stable)
CREATE TABLE IF NOT EXISTS payflow_payment_operations (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES payflow_orders(id) ON DELETE CASCADE,
    operation_type VARCHAR(64) NOT NULL CHECK (
        operation_type IN (
            'CREATE_INVOICE_DRAFT',
            'SEND_INVOICE',
            'REMIND_INVOICE',
            'CANCEL_INVOICE',
            'RECONCILE_INVOICE',
            'CREATE_ORDER_V2',
            'CAPTURE_ORDER_V2'
        )
    ),
    logical_operation_key VARCHAR(128) UNIQUE NOT NULL,
    paypal_request_id VARCHAR(128) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_FLIGHT' CHECK (
        status IN ('IN_FLIGHT', 'SUCCEEDED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL')
    ),
    http_status INT,
    paypal_resource_id VARCHAR(128),
    attempt_count INT NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
    last_error TEXT,
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payflow_payment_ops_order ON payflow_payment_operations(order_id, operation_type);

-- 7. Événements Webhooks PayPal & Vérification de Signature Cryptographique
CREATE TABLE IF NOT EXISTS payflow_events (
    id BIGSERIAL PRIMARY KEY,
    paypal_event_id VARCHAR(128) UNIQUE NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64),
    paypal_resource_id VARCHAR(128),
    order_id VARCHAR(64) REFERENCES payflow_orders(id) ON DELETE SET NULL,
    signature_verification_status VARCHAR(32) NOT NULL CHECK (
        signature_verification_status IN ('VERIFIED_SUCCESS', 'VERIFIED_FAILURE', 'ACTIVE_POLL_VERIFIED')
    ),
    processing_status VARCHAR(32) NOT NULL CHECK (
        processing_status IN ('PROCESSED', 'IGNORED_DUPLICATE', 'REJECTED_INVALID_SIGNATURE', 'ERROR')
    ),
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- =============================================================================
-- Seed Initial B2B Product Catalog (Deterministic Pricing, Costs & Stock)
-- =============================================================================
INSERT INTO payflow_products (id, sku, name, category, currency, unit_price, unit_cost, min_margin_pct, max_discount_pct, stock_on_hand, stock_reserved)
VALUES
    ('PROD-VIN-001', 'VIN-CHATEAU-2018', 'Château Margaux Grand Cru 2018 (Case of 6)', 'PRESTIGE_WINE', 'USD', 450.00, 290.00, 25.00, 10.00, 40, 0),
    ('PROD-VIN-002', 'VIN-POMEROL-2020', 'Pomerol Réserve Spéciale 2020 (Case of 6)', 'PRESTIGE_WINE', 'USD', 320.00, 200.00, 25.00, 12.00, 25, 0),
    ('PROD-VIN-003', 'VIN-CHAMP-BRUT', 'Champagne Millésimé Brut Cuvée Prestige (Case of 6)', 'CHAMPAGNE', 'USD', 280.00, 175.00, 22.00, 10.00, 60, 0),
    ('PROD-VIN-004', 'VIN-SANCERRE-BIO', 'Sancerre Blanc Domaine Bio 2023 (Case of 12)', 'WHITE_WINE', 'USD', 180.00, 105.00, 20.00, 15.00, 80, 0),
    ('PROD-VIN-005', 'SPIRIT-RHUM-XO', 'Rhum Vieux Agricole Hors d''Âge XO (Case of 6)', 'SPIRITS', 'USD', 240.00, 140.00, 25.00, 10.00, 15, 0)
ON CONFLICT (id) DO UPDATE SET
    unit_price = EXCLUDED.unit_price,
    unit_cost = EXCLUDED.unit_cost,
    min_margin_pct = EXCLUDED.min_margin_pct,
    max_discount_pct = EXCLUDED.max_discount_pct,
    updated_at = NOW();
