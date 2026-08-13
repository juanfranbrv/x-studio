/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminAudio from "../adminAudio.js";
import type * as assets from "../assets.js";
import type * as billing from "../billing.js";
import type * as brands from "../brands.js";
import type * as campaigns from "../campaigns.js";
import type * as carousel from "../carousel.js";
import type * as carouselAdmin from "../carouselAdmin.js";
import type * as carouselSeed from "../carouselSeed.js";
import type * as contentLibrary from "../contentLibrary.js";
import type * as contextDocuments from "../contextDocuments.js";
import type * as economic from "../economic.js";
import type * as feedback from "../feedback.js";
import type * as generations from "../generations.js";
import type * as initPresets from "../initPresets.js";
import type * as layoutRatings from "../layoutRatings.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_slug from "../lib/slug.js";
import type * as migration from "../migration.js";
import type * as pipeline from "../pipeline.js";
import type * as postizAccounts from "../postizAccounts.js";
import type * as presets from "../presets.js";
import type * as referrals from "../referrals.js";
import type * as replaceTemplates from "../replaceTemplates.js";
import type * as sessionImages from "../sessionImages.js";
import type * as settings from "../settings.js";
import type * as stylePresets from "../stylePresets.js";
import type * as systemPrompts from "../systemPrompts.js";
import type * as users from "../users.js";
import type * as work_sessions from "../work_sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminAudio: typeof adminAudio;
  assets: typeof assets;
  billing: typeof billing;
  brands: typeof brands;
  campaigns: typeof campaigns;
  carousel: typeof carousel;
  carouselAdmin: typeof carouselAdmin;
  carouselSeed: typeof carouselSeed;
  contentLibrary: typeof contentLibrary;
  contextDocuments: typeof contextDocuments;
  economic: typeof economic;
  feedback: typeof feedback;
  generations: typeof generations;
  initPresets: typeof initPresets;
  layoutRatings: typeof layoutRatings;
  "lib/authz": typeof lib_authz;
  "lib/slug": typeof lib_slug;
  migration: typeof migration;
  pipeline: typeof pipeline;
  postizAccounts: typeof postizAccounts;
  presets: typeof presets;
  referrals: typeof referrals;
  replaceTemplates: typeof replaceTemplates;
  sessionImages: typeof sessionImages;
  settings: typeof settings;
  stylePresets: typeof stylePresets;
  systemPrompts: typeof systemPrompts;
  users: typeof users;
  work_sessions: typeof work_sessions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
