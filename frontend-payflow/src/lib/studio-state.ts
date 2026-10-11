import type { AgReportState } from "ag-studio";
/** Apply a validated engine command without replacing the dashboard or relationships. */
export function withStatusFilter(state: AgReportState, rawStatus: string): AgReportState | null {
    const status = rawStatus === "PENDING_HITL" ? "PENDING_APPROVAL" : rawStatus;
    if (!["ALL", "PENDING_APPROVAL", "APPROVED", "INVOICE_SENT", "PAID", "BLOCKED_ANOMALY", "REJECTED", "BLOCKED_OR_REJECTED"].includes(status))
        return null;
    return {
        ...state,
        pages: state.pages.map(page => page.id !== state.selectedPageId ? page : {
            ...page,
            crossFilter: undefined,
            filter: {
                ...page.filter,
                widget: status === "ALL" ? undefined : page.filter?.widget,
                page: [
                    ...(status === "ALL" ? [] : (page.filter?.page || []).filter(filter => !["orders.status", "orders.settlement_label"].includes(filter.field.id))),
                    ...(status === "ALL" ? [] : [{
                            field: { id: "orders.status" },
                            model: status === "BLOCKED_OR_REJECTED"
                                ? { operator: "isIn" as const, value: ["BLOCKED_ANOMALY", "REJECTED", "CANCELLED", "OVERDUE"] }
                                : { operator: "equals" as const, value: status },
                        }]),
                ],
            },
        }),
    };
}
