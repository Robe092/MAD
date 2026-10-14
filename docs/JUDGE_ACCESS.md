# PayFlow AI — Judge Access & Evaluation Guide

Welcome, PayPal AI Hackathon Judges! This guide provides everything you need to review and evaluate PayFlow AI.

---

## 1. Quick Links

* **Live Demo Video (2m 25s, 1080p)**: Included in the Devpost submission and repository release (`PayFlow-AI-English-Final-v9.mp4`).
* **Source Repository**: Clean, standalone repository licensed under **MIT**.
* **Architecture Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
* **Interactive Demo Walkthrough**: [DEMO.md](DEMO.md)

---

## 2. Evaluation Options

You can evaluate PayFlow AI in two ways:

### Option A: Video & Architecture Review (Recommended — 3 Minutes)
For judges evaluating high volumes of submissions:
1. **Watch the Demo Video**: See the complete quote-to-cash lifecycle in action:
   - Natural language quote request in English/French.
   - Deterministic guardrail activation (HITL threshold triggered).
   - CFO one-click approval with cryptographic token verification.
   - Real-time PayPal Sandbox Orders v2 checkout and capture.
   - Automated stock settlement and AG Studio analytics breakdown.
2. **Review the Technical Proofs**:
   - Inspect [ARCHITECTURE.md](ARCHITECTURE.md) for the deterministic safety design.
   - Review our unit test suite (`tests/test_scripts/test_payflow_stabilized_logic.cjs`) with 44/44 passing edge-case checks.
   - Inspect our frontend security test suite (`frontend-payflow/tests/security.test.cjs`) with 18/18 passing tests.

### Option B: Local Live Installation (10–15 Minutes)
If you wish to spin up the full live environment locally:

#### Prerequisites
* Node.js 20+, npm, and Docker with Compose v2.
* Ports `3005` (Frontend Cockpit) and `5679` (n8n Engine) free.
* Optional: Your own Google Gemini API key and PayPal Sandbox Developer credentials.

#### Step-by-Step Setup
1. **Install dependencies**:
   ```bash
   npm ci --prefix frontend-payflow
   ```
2. **Initialize Database & Operator Credentials**:
   ```bash
   npm run setup
   ```
   *Automatically starts PostgreSQL 17 via Docker, executes migrations `10_payflow_init.sql`, `11_payflow_stabilization.sql`, and `12_payflow_quote_lifecycle.sql`, seeds the product catalog, and generates local operator login credentials.*
3. **Configure n8n Workflow**:
   - Open `http://127.0.0.1:5679` and log in to n8n.
   - The workflow `13_PayFlow_PayPal_Invoicing_Sandbox.json` is imported.
   - Connect your PayPal Sandbox and Gemini credentials in n8n and toggle the workflow to **Active**.
4. **Launch Cockpit**:
   ```bash
   npm run frontend
   ```
   - Open `http://127.0.0.1:3005` in your browser.
   - Log in using the credentials displayed by `npm run setup` (or stored in `.payflow-private/initial-login.txt`).

---

## 3. What to Test in the Live Cockpit

1. **Nominal Quote**: Type `"Create a quote for Acme Corp (contact: alice@acme.com) for 5 cases of Bordeaux Grand Cru."` Notice that prices and calculations come from PostgreSQL, not the LLM.
2. **Guardrail / HITL Intervention**: Request an excessive discount: `"Quote 10 cases of Pomerol for Stark Industries with a 35% discount."` The system flags `DISCOUNT_LIMIT_EXCEEDED` and `MARGIN_FLOOR_BREACH`, locks the quote, reserves stock, and demands CFO approval.
3. **PayPal Sandbox Checkout**: Click **Approve** as CFO, then click **Generate PayPal Checkout**. Follow the generated PayPal Sandbox URL to complete checkout.
4. **Instant Settlement & Analytics**: Observe real-time capture verification, stock deduction, and AG Studio portfolio visualization.

Thank you for reviewing PayFlow AI!
