import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { prisma } from "@/lib/db";
import { validCalendarBand } from "@/lib/calendar";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const startMinute = Number(body?.startMinute);
  const endMinute = Number(body?.endMinute);
  if (!validCalendarBand(startMinute, endMinute)) {
    return NextResponse.json({ error: "Choose a time range between 08:00 and 23:00." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { calendarStartMinute: startMinute, calendarEndMinute: endMinute }
  });
  return NextResponse.json({ ok: true, startMinute, endMinute });
}
