-- Close only reservations whose payment cannot still be collected.
-- No physical stock decrement, no customer acceptance inferred, no table reset.
-- Preserve the provider's terminal status truthfully (existing enum omitted it).
ALTER TABLE payflow_invoices DROP CONSTRAINT IF EXISTS payflow_invoices_paypal_status_check;
ALTER TABLE payflow_invoices ADD CONSTRAINT payflow_invoices_paypal_status_check CHECK (paypal_status IN (
 'DRAFT','SENT','SCHEDULED','PAID','MARKED_AS_PAID','PARTIALLY_PAID','CANCELLED','REFUNDED','PAYMENT_PENDING','CREATED','PAYER_ACTION_REQUIRED','APPROVED','COMPLETED','VOIDED'
));
CREATE OR REPLACE FUNCTION payflow_close_quote(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 o payflow_orders%ROWTYPE;
 inv payflow_invoices%ROWTYPE;
 oid text:=p->>'order_id';
 reason text:=p->>'reason';
 target_status text;
 r record;
 units integer:=0;
BEGIN
 IF oid IS NULL OR oid !~ '^[A-Za-z0-9_-]{1,48}$' OR reason IS NULL OR reason NOT IN ('ABANDONED','EXPIRED','PROVIDER_VOIDED') THEN
  RETURN jsonb_build_object('_http_code',400,'status','error','code','INVALID_CLOSURE');
 END IF;
 SELECT * INTO o FROM payflow_orders WHERE id=oid FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('_http_code',404,'status','error','code','ORDER_NOT_FOUND'); END IF;
 IF o.status IN ('CANCELLED','OVERDUE','REJECTED') AND NOT EXISTS(SELECT 1 FROM payflow_order_items WHERE order_id=oid AND stock_reserved_qty>0) THEN
  RETURN jsonb_build_object('_http_code',200,'status','success','order_id',oid,'order_status',o.status,'idempotent_replay',true,'released_units',0);
 END IF;
 IF o.status='PAID' THEN RETURN jsonb_build_object('_http_code',409,'status','error','code','PAID_ORDER_CANNOT_CLOSE'); END IF;
 SELECT * INTO inv FROM payflow_invoices WHERE order_id=oid;
 IF inv.id IS NOT NULL THEN
  -- Only engine-generated proof from an authenticated provider lookup may reach
  -- this branch. Browser cancel requests never supply remote proof to SQL.
   IF reason<>'PROVIDER_VOIDED' OR inv.paypal_invoice_id IS DISTINCT FROM p->>'verified_resource_id'
   OR NOT ((inv.resource_type='PAYPAL_ORDER_V2' AND p->>'verified_status'='VOIDED')
      OR (inv.resource_type='PAYPAL_INVOICE_V2' AND p->>'verified_status'='CANCELLED'))
   OR inv.capture_id IS NOT NULL OR inv.paid_amount>0 THEN
   RETURN jsonb_build_object('_http_code',409,'status','error','code','PAYMENT_RESOURCE_REQUIRES_VERIFICATION','message','Stock remains reserved while the PayPal resource is payable or in an unverified state.');
  END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM payflow_payment_operations WHERE order_id=oid AND (status <> 'FAILED_TERMINAL' OR paypal_resource_id IS NOT NULL)) THEN
   RETURN jsonb_build_object('_http_code',409,'status','error','code','PAYMENT_OPERATION_REQUIRES_VERIFICATION','message','A PayPal payment was attempted. Verify the resource before releasing stock.');
  END IF;
 END IF;
 IF reason='EXPIRED' AND NOT (o.due_date<CURRENT_DATE OR (o.status='PENDING_APPROVAL' AND EXISTS(SELECT 1 FROM payflow_approvals WHERE order_id=oid AND status='PENDING' AND expires_at<=now()))) THEN
  RETURN jsonb_build_object('_http_code',409,'status','error','code','QUOTE_NOT_EXPIRED');
 END IF;
 -- Match the catalogue lock order used by persist_quote. Preserve arithmetic
 -- integrity rather than masking a corrupted reservation using GREATEST(0,...).
 PERFORM id FROM payflow_products WHERE id IN(SELECT product_id FROM payflow_order_items WHERE order_id=oid) ORDER BY id FOR UPDATE;
 FOR r IN SELECT product_id,SUM(stock_reserved_qty)::int AS qty FROM payflow_order_items WHERE order_id=oid GROUP BY product_id LOOP
  IF (SELECT stock_reserved FROM payflow_products WHERE id=r.product_id)<r.qty THEN
   RETURN jsonb_build_object('_http_code',409,'status','error','code','RESERVATION_INTEGRITY_MISMATCH');
  END IF;
 END LOOP;
 FOR r IN SELECT product_id,SUM(stock_reserved_qty)::int AS qty FROM payflow_order_items WHERE order_id=oid GROUP BY product_id LOOP
  IF r.qty>0 THEN UPDATE payflow_products SET stock_reserved=stock_reserved-r.qty,updated_at=now() WHERE id=r.product_id;units:=units+r.qty;END IF;
 END LOOP;
 UPDATE payflow_order_items SET stock_reserved_qty=0 WHERE order_id=oid;
 UPDATE payflow_approvals SET status='EXPIRED',decided_at=COALESCE(decided_at,now()),decision_notes=reason WHERE order_id=oid AND status='PENDING';
 target_status:=CASE WHEN reason='EXPIRED' THEN 'OVERDUE' ELSE 'CANCELLED' END;
 UPDATE payflow_orders SET status=target_status,notes=reason,updated_at=now() WHERE id=oid;
 IF inv.id IS NOT NULL THEN UPDATE payflow_invoices SET paypal_status=p->>'verified_status',last_reconciled_at=now(),updated_at=now() WHERE id=inv.id;END IF;
 RETURN jsonb_build_object('_http_code',200,'status','success','order_id',oid,'order_status',target_status,'released_units',units,'message','Quote closed; reserved stock released, physical stock preserved.');
END;
$$;
REVOKE ALL ON FUNCTION payflow_close_quote(jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION payflow_expire_quotes(only_id text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r record; result jsonb; closed integer:=0;units integer:=0;
BEGIN
 FOR r IN SELECT o.id FROM payflow_orders o
  WHERE (only_id IS NULL OR o.id=only_id) AND o.status IN ('DRAFT','PENDING_APPROVAL','APPROVED')
   AND (o.due_date<CURRENT_DATE OR (o.status='PENDING_APPROVAL' AND EXISTS(SELECT 1 FROM payflow_approvals a WHERE a.order_id=o.id AND a.status='PENDING' AND a.expires_at<=now())))
   AND NOT EXISTS(SELECT 1 FROM payflow_invoices i WHERE i.order_id=o.id)
   AND NOT EXISTS(SELECT 1 FROM payflow_payment_operations op WHERE op.order_id=o.id)
  ORDER BY o.id LIMIT 100 FOR UPDATE OF o SKIP LOCKED LOOP
  result:=payflow_close_quote(jsonb_build_object('order_id',r.id,'reason','EXPIRED'));
  IF result->>'status'='success' THEN closed:=closed+1;units:=units+COALESCE((result->>'released_units')::int,0);END IF;
 END LOOP;
 RETURN jsonb_build_object('expired_quotes',closed,'released_units',units);
END;
$$;
REVOKE ALL ON FUNCTION payflow_expire_quotes(text) FROM PUBLIC;
