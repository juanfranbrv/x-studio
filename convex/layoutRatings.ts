import { v } from "convex/values";
import { requireAdmin } from "./lib/authz";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const ADMIN_EMAILS = ["juanfranbrv@gmail.com"];
const RATINGS_KEY = "layout_ratings_store_v1";
const VOTES_KEY = "layout_ratings_votes_v1";

type LayoutRatingStoreEntry = {
  totalPoints: number;
  uses: number;
  votes: number;
};

type LayoutVoteEntry = {
  layoutId: string;
  generationKey: string;
  score: number;
  createdAt: string;
};

const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

const normalizeEntry = (entry?: Partial<LayoutRatingStoreEntry>): LayoutRatingStoreEntry => {
  const totalPoints = Number(entry?.totalPoints ?? 0);
  const uses = Number(entry?.uses ?? 0);
  const votes = Number(entry?.votes ?? 0);
  return {
    totalPoints: Number.isFinite(totalPoints) ? totalPoints : 0,
    uses: Number.isFinite(uses) ? uses : 0,
    votes: Number.isFinite(votes) ? votes : 0,
  };
};

const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const normalizeGenerationKey = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // data URLs can be huge; keep a short stable fingerprint instead.
  if (trimmed.startsWith("data:")) {
    return `data:${hashString(trimmed)}`;
  }

  // Avoid very large keys inside app_settings payload.
  if (trimmed.length > 180) {
    return `long:${hashString(trimmed)}`;
  }

  return trimmed;
};

const buildVoteKey = (layoutId: string, generationKey: string) =>
  `k_${hashString(`${layoutId}|${generationKey}`)}`;

const loadStore = async (ctx: QueryCtx | MutationCtx): Promise<Record<string, LayoutRatingStoreEntry>> => {
  const setting = await ctx.db
    .query("app_settings")
    .withIndex("by_key", (q) => q.eq("key", RATINGS_KEY))
    .first();

  const value = setting?.value;
  if (!value || typeof value !== "object") return {};

  const store: Record<string, LayoutRatingStoreEntry> = {};
  Object.entries(value as Record<string, LayoutRatingStoreEntry>).forEach(([layoutId, entry]) => {
    store[layoutId] = normalizeEntry(entry);
  });
  return store;
};

const saveStore = async (
  ctx: MutationCtx,
  store: Record<string, LayoutRatingStoreEntry>,
  adminEmail: string
) => {
  const now = new Date().toISOString();
  const existing = await ctx.db
    .query("app_settings")
    .withIndex("by_key", (q) => q.eq("key", RATINGS_KEY))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      value: store,
      updated_at: now,
      updated_by: adminEmail,
    });
  } else {
    await ctx.db.insert("app_settings", {
      key: RATINGS_KEY,
      value: store,
      description: "Store de ratings de composiciones (layoutId -> stats)",
      updated_at: now,
      updated_by: adminEmail,
    });
  }
};

const loadVotesStore = async (ctx: QueryCtx | MutationCtx): Promise<Record<string, LayoutVoteEntry>> => {
  const setting = await ctx.db
    .query("app_settings")
    .withIndex("by_key", (q) => q.eq("key", VOTES_KEY))
    .first();

  const value = setting?.value;
  if (!value || typeof value !== "object") return {};

  const votes: Record<string, LayoutVoteEntry> = {};
  Object.entries(value as Record<string, LayoutVoteEntry>).forEach(([key, vote]) => {
    if (!vote || typeof vote !== "object") return;
    const layoutId = String(vote.layoutId || "");
    const generationKey = String(vote.generationKey || "");
    const score = Number(vote.score ?? 0);
    const createdAt = String(vote.createdAt || "");
    if (!layoutId || !generationKey) return;
    votes[key] = {
      layoutId,
      generationKey,
      score: Number.isFinite(score) ? score : 0,
      createdAt,
    };
  });
  return votes;
};

const saveVotesStore = async (
  ctx: MutationCtx,
  votesStore: Record<string, LayoutVoteEntry>,
  adminEmail: string
) => {
  const now = new Date().toISOString();
  const existing = await ctx.db
    .query("app_settings")
    .withIndex("by_key", (q) => q.eq("key", VOTES_KEY))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      value: votesStore,
      updated_at: now,
      updated_by: adminEmail,
    });
  } else {
    await ctx.db.insert("app_settings", {
      key: VOTES_KEY,
      value: votesStore,
      description: "Registro de votos por generacion (layoutId::generationKey)",
      updated_at: now,
      updated_by: adminEmail,
    });
  }
};

export const listLayoutRatings = query({
  args: {
    admin_email: v.string(),
    layoutIdPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const store = await loadStore(ctx);
    const prefix = args.layoutIdPrefix?.trim();

    return Object.entries(store)
      .filter(([layoutId]) => (prefix ? layoutId.startsWith(prefix) : true))
      .map(([layoutId, entry]) => {
        const normalized = normalizeEntry(entry);
        const average = normalized.uses > 0 ? normalized.totalPoints / normalized.uses : 0;
        return {
          layoutId,
          ...normalized,
          average,
        };
      });
  },
});

export const upsertLayoutVote = mutation({
  args: {
    admin_email: v.string(),
    layoutId: v.string(),
    score: v.number(),
    generationKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const score = Math.max(0, Math.min(5, Math.round(args.score)));
    const generationKey = normalizeGenerationKey(args.generationKey);
    if (!generationKey) throw new Error("generationKey is required");

    const voteKey = buildVoteKey(args.layoutId, generationKey);
    const votesStore = await loadVotesStore(ctx);
    if (votesStore[voteKey]) {
      const currentStore = await loadStore(ctx);
      const current = normalizeEntry(currentStore[args.layoutId]);
      return {
        layoutId: args.layoutId,
        ...current,
        average: current.uses > 0 ? current.totalPoints / current.uses : 0,
        alreadyVoted: true,
      };
    }

    const store = await loadStore(ctx);
    const current = normalizeEntry(store[args.layoutId]);
    const next: LayoutRatingStoreEntry = {
      totalPoints: current.totalPoints + score,
      uses: current.uses + 1,
      votes: current.votes + 1,
    };
    store[args.layoutId] = next;
    votesStore[voteKey] = {
      layoutId: args.layoutId,
      generationKey,
      score,
      createdAt: new Date().toISOString(),
    };

    await saveStore(ctx, store, args.admin_email);
    await saveVotesStore(ctx, votesStore, args.admin_email);

    return {
      layoutId: args.layoutId,
      ...next,
      average: next.uses > 0 ? next.totalPoints / next.uses : 0,
      alreadyVoted: false,
    };
  },
});

export const hasLayoutVoteForGeneration = query({
  args: {
    admin_email: v.string(),
    layoutId: v.string(),
    generationKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);
    const generationKey = normalizeGenerationKey(args.generationKey);
    if (!generationKey) return false;
    const votesStore = await loadVotesStore(ctx);
    const voteKey = buildVoteKey(args.layoutId, generationKey);
    return Boolean(votesStore[voteKey]);
  },
});

export const migrateLegacyRatings = mutation({
  args: {
    admin_email: v.string(),
    marks: v.optional(v.record(v.string(), v.union(v.literal("heart"), v.literal("skull")))),
    ratings: v.optional(
      v.record(
        v.string(),
        v.object({
          totalPoints: v.number(),
          uses: v.number(),
          votes: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const store = await loadStore(ctx);

    if (args.ratings) {
      Object.entries(args.ratings).forEach(([layoutId, incoming]) => {
        const current = normalizeEntry(store[layoutId]);
        const normalizedIncoming = normalizeEntry(incoming);
        store[layoutId] = {
          totalPoints: current.totalPoints + normalizedIncoming.totalPoints,
          uses: current.uses + normalizedIncoming.uses,
          votes: current.votes + normalizedIncoming.votes,
        };
      });
    }

    if (args.marks) {
      Object.entries(args.marks).forEach(([layoutId, mark]) => {
        const current = normalizeEntry(store[layoutId]);
        const score = mark === "heart" ? 5 : 0;
        store[layoutId] = {
          totalPoints: current.totalPoints + score,
          uses: current.uses + 1,
          votes: current.votes + 1,
        };
      });
    }

    await saveStore(ctx, store, args.admin_email);
    return { success: true };
  },
});

export const resetLayoutRatings = mutation({
  args: {
    admin_email: v.string(),
    layoutIdPrefix: v.optional(v.string()),
    exactUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.admin_email)) throw new Error("Unauthorized");
    await requireAdmin(ctx);

    const store = await loadStore(ctx);
    const prefix = args.layoutIdPrefix?.trim();
    const exactUses = args.exactUses;

    let updated = 0;
    Object.entries(store).forEach(([layoutId, entry]) => {
      if (prefix && !layoutId.startsWith(prefix)) return;
      const normalized = normalizeEntry(entry);
      if (typeof exactUses === "number" && normalized.uses !== exactUses) return;
      store[layoutId] = { totalPoints: 0, uses: 0, votes: 0 };
      updated += 1;
    });

    if (updated > 0) {
      await saveStore(ctx, store, args.admin_email);
    }

    return { success: true, updated };
  },
});
