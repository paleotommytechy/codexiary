"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";

export type CloudEntry = {
  id: string; cloudId?: string;
  raw: string; source: string; project: string; category: string;
  topics: string[]; summary: string; lesson: string; angle: string; hook: string;
  createdAt: string;
};
export type CloudDraft = {
  id: string; title: string; content: string; tone: string;
  status: string; entry_ids: string[]; created_at: string;
};
type ConvexMoment = Omit<CloudEntry, "id" | "cloudId"> & {
  _id: string; clientId: string;
};
type ConvexDraft = {
  _id: string; title: string; content: string; tone: string;
  status: string; entryIds: string[]; createdAt: string;
};

export type CloudController = {
  connected: boolean;
  configured: true;
  email: string;
  status: string;
  entries: CloudEntry[];
  drafts: CloudDraft[];
  voice: string | null;
  create: (entry: CloudEntry) => Promise<void>;
  importEntries: (entries: CloudEntry[]) => Promise<void>;
  remove: (cloudId: string) => Promise<void>;
  saveDraft: (draft: { content: string; title: string; tone: string; entryIds: string[] }) => Promise<void>;
  saveVoice: (instructions: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export function useCodexiaryCloud(): CloudController {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const rows = useQuery(anyApi.journal.list, isAuthenticated ? {} : "skip") as ConvexMoment[] | undefined;
  const drafts = useQuery(anyApi.drafts.list, isAuthenticated ? {} : "skip") as ConvexDraft[] | undefined;
  const voice = useQuery(anyApi.voice.get, isAuthenticated ? {} : "skip") as string | undefined;
  const create = useMutation(anyApi.journal.create);
  const importLocal = useMutation(anyApi.journal.importLocal);
  const remove = useMutation(anyApi.journal.remove);
  const saveDraft = useMutation(anyApi.drafts.create);
  const saveVoice = useMutation(anyApi.voice.update);

  return {
    configured: true,
    connected: isAuthenticated,
    email: user?.primaryEmailAddress?.emailAddress || "",
    status: isLoading ? "Connecting..." : !isAuthenticated ? "Not signed in" :
      rows === undefined ? "Syncing..." : "Up to date",
    entries: (rows || []).map((row) => ({
      id: row.clientId,
      cloudId: row._id,
      raw: row.raw, source: row.source, project: row.project, category: row.category,
      topics: row.topics, summary: row.summary, lesson: row.lesson,
      angle: row.angle, hook: row.hook, createdAt: row.createdAt,
    })),
    drafts: (drafts || []).map((row) => ({
      id: row._id, title: row.title, content: row.content,
      tone: row.tone, status: row.status, entry_ids: row.entryIds, created_at: row.createdAt,
    })),
    voice: voice ?? null,
    create: async (entry) => {
      await create({ clientId: entry.id, raw: entry.raw, source: entry.source,
        project: entry.project, category: entry.category, topics: entry.topics,
        summary: entry.summary, lesson: entry.lesson, angle: entry.angle,
        hook: entry.hook, createdAt: entry.createdAt });
    },
    importEntries: async (entries) => {
      for (let i = 0; i < entries.length; i += 100) {
        const batch = entries.slice(i, i + 100);
        await importLocal({ entries: batch.map((entry) => ({
          clientId: entry.id, raw: entry.raw, source: entry.source,
          project: entry.project, category: entry.category, topics: entry.topics,
          summary: entry.summary, lesson: entry.lesson, angle: entry.angle,
          hook: entry.hook, createdAt: entry.createdAt,
        })) });
      }
    },
    remove: async (cloudId) => { await remove({ id: cloudId }); },
    saveDraft: async (draft) => { await saveDraft(draft); },
    saveVoice: async (instructions) => { await saveVoice({ instructions }); },
    signOut: async () => { await signOut(); },
  };
}
