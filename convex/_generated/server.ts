/*
 * CI-friendly bootstrap: typed against the committed schema.
 * The Convex CLI regenerates this directory for the linked deployment.
 */
import {
  queryGeneric,
  mutationGeneric,
  internalQueryGeneric,
  internalMutationGeneric,
  actionGeneric,
  type QueryBuilder,
  type MutationBuilder,
  type ActionBuilder,
  type DataModelFromSchemaDefinition,
} from "convex/server";
import schema from "../schema";

type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export const query = queryGeneric as QueryBuilder<DataModel, "public">;
export const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
export const internalQuery = internalQueryGeneric as QueryBuilder<DataModel, "internal">;
export const internalMutation = internalMutationGeneric as MutationBuilder<DataModel, "internal">;
export const action = actionGeneric as ActionBuilder<DataModel, "public">;
