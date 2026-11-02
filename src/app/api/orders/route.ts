import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createOrder, listOrders, orderInput } from "@/lib/order-store";

const publicOrderInput = orderInput.omit({ status: true });

export async function GET() {
  try { return NextResponse.json({ orders: await listOrders() }); }
  catch { return NextResponse.json({ error: "order_state_unavailable" }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const parsed = publicOrderInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "invalid_order" }, { status: 400 });
    const result = await createOrder({ ...parsed.data, status: "requested" });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const invalid = error instanceof ZodError;
    return NextResponse.json({ error: invalid ? "invalid_order" : error instanceof Error ? error.message : "order_write_failed" }, { status: invalid ? 400 : 409 });
  }
}
