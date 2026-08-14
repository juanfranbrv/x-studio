import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/authz";

const MAX_ROWS_PER_TABLE = 2_000;
const MAX_TOTAL_WRITES = 5_000;
const EXECUTION_CONFIRMATION = "MIGRATE_SOURCE_TO_TARGET";

const countValidator = v.object({
  brand_dna: v.number(),
  brands: v.number(),
  presets: v.number(),
  feedback: v.number(),
  work_sessions: v.number(),
  session_images: v.number(),
  content_asset_annotations: v.number(),
  content_campaigns: v.number(),
  campaign_jobs: v.number(),
  campaign_job_items: v.number(),
  postiz_accounts: v.number(),
  economic_audit_events: v.number(),
});

const collisionValidator = v.object({
  kind: v.string(),
  key: v.string(),
});

const inspectionValidator = v.object({
  sourceUserExists: v.boolean(),
  targetUserExists: v.boolean(),
  counts: countValidator,
  total: v.number(),
  overflow: v.boolean(),
  collisions: v.array(collisionValidator),
});

type ReadCtx = QueryCtx | MutationCtx;

async function loadOwnershipRows(ctx: ReadCtx, clerkId: string) {
  const limit = MAX_ROWS_PER_TABLE + 1;
  const [
    brandDNA,
    brands,
    presets,
    feedback,
    workSessions,
    sessionImages,
    annotations,
    campaigns,
    campaignJobs,
    campaignJobItems,
    postizAccounts,
    economicAuditEvents,
  ] = await Promise.all([
    ctx.db
      .query("brand_dna")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", clerkId))
      .take(limit),
    ctx.db
      .query("brands")
      .withIndex("by_owner", (q) => q.eq("owner_id", clerkId))
      .take(limit),
    ctx.db
      .query("presets")
      .withIndex("by_user", (q) => q.eq("userId", clerkId))
      .take(limit),
    ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", clerkId))
      .take(limit),
    ctx.db
      .query("work_sessions")
      .withIndex("by_user_module", (q) => q.eq("user_id", clerkId))
      .take(limit),
    ctx.db
      .query("session_images")
      .withIndex("by_user", (q) => q.eq("user_id", clerkId))
      .take(limit),
    ctx.db
      .query("content_asset_annotations")
      .withIndex("by_user_asset", (q) => q.eq("user_id", clerkId))
      .take(limit),
    ctx.db
      .query("content_campaigns")
      .withIndex("by_user", (q) => q.eq("user_id", clerkId))
      .take(limit),
    ctx.db
      .query("campaign_jobs")
      .withIndex("by_user", (q) => q.eq("user_id", clerkId))
      .take(limit),
    ctx.db
      .query("campaign_job_items")
      .withIndex("by_user", (q) => q.eq("user_id", clerkId))
      .take(limit),
    ctx.db
      .query("postiz_accounts")
      .withIndex("by_user", (q) => q.eq("user_id", clerkId))
      .take(limit),
    ctx.db
      .query("economic_audit_events")
      .withIndex("by_user", (q) => q.eq("user_clerk_id", clerkId))
      .take(limit),
  ]);

  return {
    brandDNA,
    brands,
    presets,
    feedback,
    workSessions,
    sessionImages,
    annotations,
    campaigns,
    campaignJobs,
    campaignJobItems,
    postizAccounts,
    economicAuditEvents,
  };
}

function buildCounts(rows: Awaited<ReturnType<typeof loadOwnershipRows>>) {
  return {
    brand_dna: rows.brandDNA.length,
    brands: rows.brands.length,
    presets: rows.presets.length,
    feedback: rows.feedback.length,
    work_sessions: rows.workSessions.length,
    session_images: rows.sessionImages.length,
    content_asset_annotations: rows.annotations.length,
    content_campaigns: rows.campaigns.length,
    campaign_jobs: rows.campaignJobs.length,
    campaign_job_items: rows.campaignJobItems.length,
    postiz_accounts: rows.postizAccounts.length,
    economic_audit_events: rows.economicAuditEvents.length,
  };
}

async function inspectMigration(ctx: ReadCtx, sourceClerkId: string, targetClerkId: string) {
  if (!sourceClerkId || !targetClerkId || sourceClerkId === targetClerkId) {
    throw new Error("ownership_migration_invalid_identity_pair");
  }

  const [rows, sourceUser, targetUser, targetPostizAccounts] = await Promise.all([
    loadOwnershipRows(ctx, sourceClerkId),
    ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", sourceClerkId))
      .first(),
    ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", targetClerkId))
      .first(),
    ctx.db
      .query("postiz_accounts")
      .withIndex("by_user", (q) => q.eq("user_id", targetClerkId))
      .take(1),
  ]);

  const collisions: Array<{ kind: string; key: string }> = [];
  if (sourceUser && targetUser) {
    collisions.push({ kind: "duplicate_user_records", key: targetClerkId });
  }
  if (!sourceUser && !targetUser) {
    collisions.push({ kind: "missing_user_record", key: targetClerkId });
  }
  if (rows.postizAccounts.length > 0 && targetPostizAccounts.length > 0) {
    collisions.push({ kind: "postiz_account", key: targetClerkId });
  }

  for (const annotation of rows.annotations) {
    const duplicate = await ctx.db
      .query("content_asset_annotations")
      .withIndex("by_user_asset", (q) =>
        q.eq("user_id", targetClerkId).eq("asset_key", annotation.asset_key),
      )
      .first();
    if (duplicate) {
      collisions.push({ kind: "content_asset_annotation", key: annotation.asset_key });
    }
  }

  const counts = buildCounts(rows);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const overflow =
    total > MAX_TOTAL_WRITES ||
    Object.values(counts).some((count) => count > MAX_ROWS_PER_TABLE);

  return {
    rows,
    inspection: {
      sourceUserExists: Boolean(sourceUser),
      targetUserExists: Boolean(targetUser),
      counts,
      total,
      overflow,
      collisions,
    },
    sourceUser,
    userRecord: targetUser ?? sourceUser,
  };
}

export const inspect = query({
  args: {
    source_clerk_id: v.string(),
    target_clerk_id: v.string(),
  },
  returns: inspectionValidator,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { inspection } = await inspectMigration(
      ctx,
      args.source_clerk_id,
      args.target_clerk_id,
    );
    return inspection;
  },
});

export const execute = mutation({
  args: {
    source_clerk_id: v.string(),
    target_clerk_id: v.string(),
    confirmation: v.string(),
  },
  returns: v.object({
    migrated: v.number(),
    counts: countValidator,
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.confirmation !== EXECUTION_CONFIRMATION) {
      throw new Error("ownership_migration_confirmation_required");
    }

    const { rows, inspection, sourceUser, userRecord } = await inspectMigration(
      ctx,
      args.source_clerk_id,
      args.target_clerk_id,
    );
    if (inspection.overflow) throw new Error("ownership_migration_too_large");
    if (inspection.collisions.length > 0 || !userRecord) {
      throw new Error(
        `ownership_migration_collisions:${inspection.collisions
          .map((collision) => `${collision.kind}:${collision.key}`)
          .join(",")}`,
      );
    }

    if (sourceUser) {
      await ctx.db.patch(sourceUser._id, { clerk_id: args.target_clerk_id });
    }

    const targetEmail = userRecord.email;
    await Promise.all([
      ...rows.brandDNA.map((item) =>
        ctx.db.patch(item._id, { clerk_user_id: args.target_clerk_id }),
      ),
      ...rows.brands.map((item) =>
        ctx.db.patch(item._id, { owner_id: args.target_clerk_id }),
      ),
      ...rows.presets.map((item) =>
        ctx.db.patch(item._id, { userId: args.target_clerk_id }),
      ),
      ...rows.feedback.map((item) =>
        ctx.db.patch(item._id, {
          userId: args.target_clerk_id,
          userEmail: targetEmail,
        }),
      ),
      ...rows.workSessions.map((item) =>
        ctx.db.patch(item._id, { user_id: args.target_clerk_id }),
      ),
      ...rows.sessionImages.map((item) =>
        ctx.db.patch(item._id, { user_id: args.target_clerk_id }),
      ),
      ...rows.annotations.map((item) =>
        ctx.db.patch(item._id, { user_id: args.target_clerk_id }),
      ),
      ...rows.campaigns.map((item) =>
        ctx.db.patch(item._id, { user_id: args.target_clerk_id }),
      ),
      ...rows.campaignJobs.map((item) =>
        ctx.db.patch(item._id, { user_id: args.target_clerk_id }),
      ),
      ...rows.campaignJobItems.map((item) =>
        ctx.db.patch(item._id, { user_id: args.target_clerk_id }),
      ),
      ...rows.postizAccounts.map((item) =>
        ctx.db.patch(item._id, { user_id: args.target_clerk_id }),
      ),
      ...rows.economicAuditEvents.map((item) =>
        ctx.db.patch(item._id, { user_clerk_id: args.target_clerk_id }),
      ),
    ]);

    return { migrated: inspection.total, counts: inspection.counts };
  },
});
