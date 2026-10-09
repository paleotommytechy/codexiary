/*
 * Bootstrap shim for first-time CI builds.
 * Run npx convex dev --once against the existing Codexiary deployment;
 * Convex will replace this file with its generated, schema-aware version.
 */
export {
  queryGeneric as query,
  mutationGeneric as mutation,
  internalMutationGeneric as internalMutation,
  internalQueryGeneric as internalQuery,
  actionGeneric as action,
} from "convex/server";
