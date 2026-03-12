import { NextResponse } from "next/server";
import { getCronSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BodyCheckpointEntryRow, DailyCheckinRow } from "@/lib/types";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");

  if (secret !== getCronSecret()) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("daily_checkins")
    .select("*")
    .or("study_proof_path.not.is.null,screen_time_proof_path.not.is.null,body_proof_path.not.is.null")
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const now = Date.now();
  const rows = (data as DailyCheckinRow[] | null) ?? [];
  let cleaned = 0;

  for (const row of rows) {
    const expiredCategories: Array<"study" | "screen_time" | "body"> = [];
    const pathsToDelete = [
      row.study_proof_path && row.study_proof_expires_at && new Date(row.study_proof_expires_at).getTime() <= now
        ? (expiredCategories.push("study"), row.study_proof_path)
        : null,
      row.screen_time_proof_path &&
      row.screen_time_proof_expires_at &&
      new Date(row.screen_time_proof_expires_at).getTime() <= now
        ? (expiredCategories.push("screen_time"), row.screen_time_proof_path)
        : null,
      row.body_proof_path && row.body_proof_expires_at && new Date(row.body_proof_expires_at).getTime() <= now
        ? (expiredCategories.push("body"), row.body_proof_path)
        : null,
    ].filter(Boolean) as string[];

    if (pathsToDelete.length === 0) {
      continue;
    }

    await admin.storage.from("proofs").remove(pathsToDelete);

    const patch: Partial<DailyCheckinRow> = {};

    if (pathsToDelete.includes(row.study_proof_path ?? "")) {
      patch.study_proof_path = null;
    }

    if (pathsToDelete.includes(row.screen_time_proof_path ?? "")) {
      patch.screen_time_proof_path = null;
    }

    if (pathsToDelete.includes(row.body_proof_path ?? "")) {
      patch.body_proof_path = null;
    }

    const { error: updateError } = await admin
      .from("daily_checkins")
      .update(patch)
      .eq("id", row.id);

    if (expiredCategories.length > 0) {
      await admin
        .from("proof_reactions")
        .delete()
        .eq("checkin_id", row.id)
        .in("category", expiredCategories)
        .is("checkpoint_index", null);
    }

    if (!updateError) {
      cleaned += pathsToDelete.length;
    }
  }

  const { data: checkpointData, error: checkpointError } = await admin
    .from("body_checkpoint_entries")
    .select("*")
    .not("proof_path", "is", null)
    .limit(400);

  if (checkpointError) {
    return NextResponse.json({ ok: false, message: checkpointError.message }, { status: 500 });
  }

  const checkpointRows = (checkpointData as BodyCheckpointEntryRow[] | null) ?? [];

  for (const checkpoint of checkpointRows) {
    if (!checkpoint.proof_path || !checkpoint.proof_expires_at || new Date(checkpoint.proof_expires_at).getTime() > now) {
      continue;
    }

    await admin.storage.from("proofs").remove([checkpoint.proof_path]);

    const { error: updateError } = await admin
      .from("body_checkpoint_entries")
      .update({
        proof_path: null,
      })
      .eq("id", checkpoint.id);

    await admin
      .from("proof_reactions")
      .delete()
      .eq("checkin_id", checkpoint.checkin_id)
      .eq("category", "body")
      .eq("checkpoint_index", checkpoint.checkpoint_index);

    if (!updateError) {
      cleaned += 1;
    }
  }

  return NextResponse.json({ ok: true, cleaned });
}
