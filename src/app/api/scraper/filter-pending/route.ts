import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { originAllowed, rejectOrigin } from "@/lib/origin";
import { filterPendingToSettings } from "@/lib/scraper/pending-settings-filter";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return rejectOrigin();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can filter pending events." }, { status: 403 });
  }
  try {
    const result = await filterPendingToSettings(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Pending settings filter failed", error);
    return NextResponse.json({ error: "Could not filter pending events." }, { status: 500 });
  }
}
