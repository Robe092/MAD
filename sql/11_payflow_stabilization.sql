-- Atomic quote persistence. Does not alter existing tables or reset catalogue.
CREATE OR REPLACE FUNCTION payflow_persist_quote(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  o payflow_orders%ROWTYPE;
  product payflow_products%ROWTYPE;
  line jsonb;
  old_lines jsonb;
  new_lines jsonb := '[]'::jsonb;
  flags jsonb := COALESCE(p->'anomalies','[]'::jsonb);
  shortage boolean := false;
  oid text := p->>'order_id';
  expected_count integer;
BEGIN
  IF oid IS NULL OR oid !~ '^[A-Za-z0-9_-]{1,48}$' OR jsonb_typeof(p->'lines') <> 'array' THEN
    RETURN jsonb_build_object('_http_code',400,'status','error','code','INVALID_ORDER');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('payflow-quote:' || oid, 0));
  SELECT * INTO o FROM payflow_orders WHERE id=oid FOR UPDATE;
  IF FOUND THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('sku',sku,'quantity',quantity,'applied_unit_price',applied_unit_price) ORDER BY sku),'[]'::jsonb)
      INTO old_lines FROM payflow_order_items WHERE order_id=oid;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('sku',x->>'sku','quantity',(x->>'quantity')::int,'applied_unit_price',(x->>'applied_unit_price')::numeric) ORDER BY x->>'sku'),'[]'::jsonb)
      INTO new_lines FROM jsonb_array_elements(p->'lines') x;
    IF old_lines <> new_lines OR o.customer_email <> p->>'customer_email' OR o.customer_name <> p->>'customer_name'
      OR COALESCE(o.customer_company,'') <> COALESCE(p->>'customer_company','')
      OR o.tax_rate_pct <> (p->>'tax_rate_pct')::numeric OR o.total_amount <> (p->>'total_amount')::numeric THEN
      RETURN jsonb_build_object('_http_code',409,'status','error','code','ORDER_ID_CONFLICT','message','Cette référence appartient déjà à une commande différente.');
    END IF;
    RETURN p || jsonb_build_object('_http_code',200,'status','success','order_status',o.status,'requires_hitl',o.requires_hitl,'anomalies',o.anomaly_flags,'idempotent_replay',true,
      'approval_token',(SELECT approval_token FROM payflow_approvals WHERE order_id=oid AND status='PENDING' AND expires_at>now() LIMIT 1),
      'lines',(SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.id),'[]'::jsonb) FROM payflow_order_items i WHERE i.order_id=oid));
  END IF;
  new_lines := '[]'::jsonb;
  -- All callers lock the same product order, serializing competing reservations.
  PERFORM id FROM payflow_products WHERE id IN (SELECT x->>'product_id' FROM jsonb_array_elements(p->'lines') x) ORDER BY id FOR UPDATE;
  FOR line IN SELECT x FROM jsonb_array_elements(p->'lines') x LOOP
    SELECT * INTO product FROM payflow_products WHERE id=line->>'product_id' AND is_active;
    IF NOT FOUND OR product.sku <> line->>'sku' OR product.unit_price <> (line->>'catalog_unit_price')::numeric
      OR product.unit_cost <> (line->>'unit_cost_snapshot')::numeric THEN
      RETURN jsonb_build_object('_http_code',409,'status','error','code','CATALOG_CHANGED','message','Le catalogue a changé. Relancez la demande.');
    END IF;
    IF (line->>'quantity')::int > product.stock_on_hand-product.stock_reserved THEN
      shortage := true;
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(flags) f WHERE f->>'code'='INSUFFICIENT_STOCK' AND f->>'sku'=product.sku) THEN
        flags := flags || jsonb_build_array(jsonb_build_object('code','INSUFFICIENT_STOCK','sku',product.sku,'requested',(line->>'quantity')::int,
          'available',product.stock_on_hand-product.stock_reserved,'message','Stock disponible insuffisant pour ' || product.sku || '.'));
      END IF;
    END IF;
  END LOOP;
  IF shortage THEN
    p := p || jsonb_build_object('_http_code',422,'status','blocked','order_status','BLOCKED_ANOMALY','requires_hitl',false,'approval_token',null,'anomalies',flags,
      'copilot_explanation','Commande bloquée : stock disponible insuffisant. Aucun stock réservé.');
  END IF;
  FOR line IN SELECT x FROM jsonb_array_elements(p->'lines') x LOOP
    line := line || jsonb_build_object('stock_reserved_qty',CASE WHEN p->>'order_status'='BLOCKED_ANOMALY' THEN 0 ELSE (line->>'quantity')::int END);
    new_lines := new_lines || jsonb_build_array(line);
  END LOOP;
  p := p || jsonb_build_object('lines',new_lines);
  INSERT INTO payflow_orders(id,quote_number,customer_name,customer_email,customer_company,currency,subtotal_amount,discount_amount,tax_rate_pct,tax_amount,total_amount,total_cost_amount,computed_margin_pct,payment_channel,status,requires_hitl,anomaly_flags,control_summary,due_date)
    VALUES(oid,p->>'quote_number',p->>'customer_name',p->>'customer_email',p->>'customer_company','USD',(p->>'subtotal_amount')::numeric,(p->>'discount_amount')::numeric,
      (p->>'tax_rate_pct')::numeric,(p->>'tax_amount')::numeric,(p->>'total_amount')::numeric,(p->>'total_cost_amount')::numeric,(p->>'computed_margin_pct')::numeric,
      p->>'payment_channel',p->>'order_status',(p->>'requires_hitl')::boolean,p->'anomalies',COALESCE((SELECT string_agg(x->>'code',', ') FROM jsonb_array_elements(p->'anomalies') x),'ALL_CONTROLS_PASSED'),CURRENT_DATE+10);
  FOR line IN SELECT x FROM jsonb_array_elements(new_lines) x LOOP
    INSERT INTO payflow_order_items(order_id,product_id,sku,product_name,quantity,catalog_unit_price,unit_cost_snapshot,applied_unit_price,discount_pct,line_total,line_margin_pct,stock_reserved_qty,line_anomalies)
      VALUES(oid,line->>'product_id',line->>'sku',line->>'product_name',(line->>'quantity')::int,(line->>'catalog_unit_price')::numeric,(line->>'unit_cost_snapshot')::numeric,
        (line->>'applied_unit_price')::numeric,(line->>'discount_pct')::numeric,(line->>'line_total')::numeric,(line->>'line_margin_pct')::numeric,(line->>'stock_reserved_qty')::int,line->'line_anomalies');
    IF (line->>'stock_reserved_qty')::int > 0 THEN
      UPDATE payflow_products SET stock_reserved=stock_reserved+(line->>'stock_reserved_qty')::int,updated_at=now() WHERE id=line->>'product_id';
    END IF;
  END LOOP;
  IF (p->>'requires_hitl')::boolean THEN
    INSERT INTO payflow_approvals(id,order_id,approval_token,reason_codes,proposal_snapshot,status,expires_at)
      VALUES('APP-'||oid,oid,p->>'approval_token',COALESCE((SELECT jsonb_agg(x->'code') FROM jsonb_array_elements(p->'anomalies') x),'[]'::jsonb),p,'PENDING',now()+interval '48 hours');
  END IF;
  RETURN p;
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('_http_code',409,'status','error','code','ORDER_REFERENCE_CONFLICT','message','La référence de devis est déjà utilisée.');
END;
$$;

REVOKE ALL ON FUNCTION payflow_persist_quote(jsonb) FROM PUBLIC;
-- Grant to the actual existing workflow role during deployment, never anon.

-- Claim a resource creation before any provider call. A competing request,
-- including a different channel, cannot create a second PayPal resource.
CREATE OR REPLACE FUNCTION payflow_claim_payment(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  o payflow_orders%ROWTYPE;
  inv payflow_invoices%ROWTYPE;
  op payflow_payment_operations%ROWTYPE;
  oid text := p->>'order_id';
  channel text := p->>'channel';
  key text;
  total numeric;
  lines jsonb;
BEGIN
  PERFORM payflow_expire_quotes(oid);
  SELECT * INTO o FROM payflow_orders WHERE id=oid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('proceed',false,'_http_code',404,'status','error','code','ORDER_NOT_FOUND_IN_DB'); END IF;
  channel := COALESCE(channel,o.payment_channel);
  IF channel NOT IN ('ORDERS_V2','INVOICING_V2') THEN RETURN jsonb_build_object('proceed',false,'_http_code',400,'status','error','code','INVALID_PAYMENT_CHANNEL'); END IF;
  IF o.status NOT IN ('APPROVED','INVOICE_SENT','INVOICE_DRAFT_CREATED') THEN RETURN jsonb_build_object('proceed',false,'_http_code',403,'status','error','code','ORDER_NOT_APPROVED'); END IF;
  IF o.customer_name IS NULL OR btrim(o.customer_name)='' OR o.customer_email IS NULL OR o.customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RETURN jsonb_build_object('proceed',false,'_http_code',422,'status','error','code','CUSTOMER_INFORMATION_REQUIRED','message','Renseignez le nom et une adresse email valide avant émission PayPal.');
  END IF;
  IF p ? 'total_amount' AND (p->>'total_amount')::numeric <> o.total_amount THEN RETURN jsonb_build_object('proceed',false,'_http_code',422,'status','error','code','PAYLOAD_AMOUNT_TAMPERING_DETECTED'); END IF;
  SELECT * INTO inv FROM payflow_invoices WHERE order_id=oid;
  IF FOUND THEN
    IF (inv.resource_type='PAYPAL_INVOICE_V2') <> (channel='INVOICING_V2') THEN RETURN jsonb_build_object('proceed',false,'_http_code',409,'status','error','code','PAYMENT_CHANNEL_ALREADY_BOUND'); END IF;
    IF o.status <> 'INVOICE_DRAFT_CREATED' THEN
      RETURN jsonb_build_object('proceed',false,'_http_code',200,'status','success','idempotent_replay',true,'order_id',oid,'channel_used',channel,'resource_type',inv.resource_type,
        'paypal_resource_id',inv.paypal_invoice_id,'payment_url',inv.recipient_view_url,'db_verified_amount',o.total_amount);
    END IF;
  END IF;
  SELECT SUM(line_total),jsonb_agg(to_jsonb(i) ORDER BY id) INTO total,lines FROM payflow_order_items i WHERE order_id=oid;
  IF total IS NULL OR total+o.tax_amount<>o.total_amount OR o.total_amount<=0 OR EXISTS(SELECT 1 FROM payflow_order_items WHERE order_id=oid AND stock_reserved_qty<>quantity) THEN
    RETURN jsonb_build_object('proceed',false,'_http_code',422,'status','error','code','PERSISTED_ORDER_INTEGRITY_MISMATCH');
  END IF;
  IF EXISTS(SELECT 1 FROM payflow_payment_operations WHERE order_id=oid AND status='IN_FLIGHT' AND updated_at>now()-interval '120 seconds') THEN
    RETURN jsonb_build_object('proceed',false,'_http_code',409,'status','error','code','PAYMENT_OPERATION_IN_PROGRESS','message','Une émission PayPal est déjà en cours.');
  END IF;
  IF EXISTS(SELECT 1 FROM payflow_payment_operations WHERE order_id=oid AND operation_type IN ('CREATE_INVOICE_DRAFT','CREATE_ORDER_V2') AND logical_operation_key <> 'create_pay:'||channel||':'||oid) THEN
    RETURN jsonb_build_object('proceed',false,'_http_code',409,'status','error','code','PAYMENT_CHANNEL_ALREADY_BOUND');
  END IF;
  key := 'create_pay:'||channel||':'||oid;
  INSERT INTO payflow_payment_operations(id,order_id,operation_type,logical_operation_key,paypal_request_id,status,request_payload)
    VALUES(CASE WHEN channel='INVOICING_V2' THEN 'OP-INV-' ELSE 'OP-' END || oid,oid,CASE WHEN channel='INVOICING_V2' THEN 'CREATE_INVOICE_DRAFT' ELSE 'CREATE_ORDER_V2' END,
      key,p->>'request_id','IN_FLIGHT',jsonb_build_object('lease_owner',p->>'lease_owner'))
    ON CONFLICT(logical_operation_key) DO UPDATE SET status='IN_FLIGHT',request_payload=EXCLUDED.request_payload,attempt_count=payflow_payment_operations.attempt_count+1,updated_at=now()
    RETURNING * INTO op;
  RETURN jsonb_build_object('proceed',true,'order',to_jsonb(o),'items',lines,'invoice',CASE WHEN inv.id IS NULL THEN NULL ELSE to_jsonb(inv) END,
    'channel',channel,'logical_key',key,'lease_owner',p->>'lease_owner');
END;
$$;
REVOKE ALL ON FUNCTION payflow_claim_payment(jsonb) FROM PUBLIC;
