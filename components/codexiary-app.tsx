"use client";

import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Clipboard,
  Clock3,
  FileText,
  Github,
  GraduationCap,
  Home,
  Lightbulb,
  Menu,
  Mic,
  NotebookPen,
  PenLine,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserSupabase, isCloudConfigured } from "@/lib/supabase/browser";

type View = "dashboard" | "capture" | "journal" | "content" | "settings";

type Entry = {
  id: string;
  raw: string;
  source: string;
  project: string;
  category: string;
  topics: string[];
  summary: string;
  lesson: string;
  angle: string;
  hook: string;
  createdAt: string;
};

type CloudDraft = {
  id: string;
  title: string;
  content: string;
  tone: string;
  status: string;
  entry_ids: string[];
  created_at: string;
};

type CloudJournalRow = {
  id: string;
  raw: string;
  source: string;
  project: string;
  category: string;
  topics: string[];
  summary: string;
  lesson: string;
  angle: string;
  hook: string;
  created_at: string;
};

function rowToEntry(row: CloudJournalRow): Entry {
  return {
    id: row.id,
    raw: row.raw,
    source: row.source,
    project: row.project,
    category: row.category,
    topics: row.topics,
    summary: row.summary,
    lesson: row.lesson,
    angle: row.angle,
    hook: row.hook,
    createdAt: row.created_at,
  };
}

function entryToRow(entry: Entry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    raw: entry.raw,
    source: entry.source,
    project: entry.project,
    category: entry.category,
    topics: entry.topics,
    summary: entry.summary,
    lesson: entry.lesson,
    angle: entry.angle,
    hook: entry.hook,
    created_at: entry.createdAt,
  };
}

const DEFAULT_VOICE = "Write in first person, with thoughtful and clear language. Be specific and honest. Avoid generic hype, excessive emojis, invented results and corporate-sounding announcements.";

type AIOrganizeResult = Pick<
  Entry,
  "summary" | "category" | "topics" | "lesson" | "angle" | "hook"
>;

const STORAGE_KEY = "codexiary:v1:entries";

const sources = [
  "Project",
  "Lecture",
  "Assignment",
  "Workshop",
  "Conference",
  "Tech content",
  "Career",
  "Other",
];

const categories = [
  "Building",
  "Learning",
  "AI & Engineering",
  "Career",
  "Leadership",
];

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Today", icon: Home },
  { id: "capture", label: "Capture", icon: Plus },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "content", label: "Content studio", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function localOrganize(raw: string, source: string): AIOrganizeResult {
  const lower = raw.toLowerCase();

  let category = "Learning";
  if (/build|code|debug|feature|bug|deploy|api|database|frontend|backend|project/.test(lower)) {
    category = "Building";
  }
  if (/ai|machine learning|ml|computer vision|embedded|arduino|iot|model/.test(lower)) {
    category = "AI & Engineering";
  }
  if (/intern|career|conference|network|workplace|mentor|job|industry/.test(lower)) {
    category = "Career";
  }
  if (/lead|team|community|president|volunteer|coordinate/.test(lower)) {
    category = "Leadership";
  }
  if (/lecture|assignment|course|class|study|learned|learnt|workshop/.test(lower)) {
    category = "Learning";
  }

  const topicMap = [
    "React",
    "TypeScript",
    "JavaScript",
    "Python",
    "Expo",
    "React Native",
    "Convex",
    "Supabase",
    "GitHub",
    "AI",
    "Machine Learning",
    "Embedded Systems",
    "Networking",
    "Database",
    "API",
    "Debugging",
    "Leadership",
  ];

  const topics = topicMap
    .filter((topic) => lower.includes(topic.toLowerCase()))
    .slice(0, 5);

  if (!topics.length) {
    topics.push(source === "Project" ? "Product building" : source);
  }

  const clean = raw.replace(/\s+/g, " ").trim();
  const summary = clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;

  const learnedMatch = clean.match(
    /(?:learned|learnt|realized|realised|discovered|understood|takeaway)[:\s-]*(.{12,180})/i,
  );

  const lesson = learnedMatch?.[1]?.trim()
    ? learnedMatch[1].trim()
    : "There is a useful lesson here worth revisiting after the work has had time to settle.";

  const angle =
    category === "Building"
      ? "Turn the implementation experience into a practical builder lesson."
      : category === "Learning"
        ? "Connect what you learned to how it changes your understanding or practice."
        : category === "Career"
          ? "Share the professional lesson without turning it into an announcement."
          : category === "Leadership"
            ? "Share the decision, tension, or people lesson behind the experience."
            : "Explain the concept through the real problem that made it meaningful.";

  const hook =
    category === "Building"
      ? "The useful lesson was not the feature I built. It was what broke while I was building it."
      : category === "Learning"
        ? "A concept became much clearer to me when I stopped treating it like something to memorize."
        : category === "Career"
          ? "One small professional experience changed how I think about doing good technical work."
          : category === "Leadership"
            ? "Leading people keeps teaching me that clarity matters before motivation."
            : "The interesting part of learning new technology is the moment it becomes useful.";

  return { summary, category, topics, lesson, angle, hook };
}

function localDraft(entry: Entry, tone: string) {
  const toneLine =
    tone === "Technical"
      ? "Here is the technical part that stood out:"
      : tone === "Concise"
        ? "The takeaway:"
        : "What stayed with me was this:";

  return `${entry.hook}

${entry.raw.trim()}

${toneLine}

${entry.lesson}

I am documenting moments like this more deliberately now — not because every day needs to become content, but because useful lessons disappear quickly when I do not write them down.

#LearningInPublic #SoftwareDevelopment`;
}

async function callAI(payload: Record<string, unknown>) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("AI unavailable");
  }

  return response.json();
}

export default function CodexiaryApp() {
  const [view, setView] = useState<View>("dashboard");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cloudEntries, setCloudEntries] = useState<Entry[]>([]);
  const [cloudDrafts, setCloudDrafts] = useState<CloudDraft[]>([]);
  const [cloudUser, setCloudUser] = useState<string | null>(null);
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudStatus, setCloudStatus] = useState("");
  const [voiceInstructions, setVoiceInstructions] = useState(DEFAULT_VOICE);
  const [hydrated, setHydrated] = useState(false);
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState("Project");
  const [project, setProject] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [tone, setTone] = useState("Reflective");
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch {
      // Keep the app usable even if local storage is blocked.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(t);
  }, [notice]);

  const allEntries = useMemo(() => {
    const ids = new Set(cloudEntries.map((entry) => entry.id));
    return [...cloudEntries, ...entries.filter((entry) => !ids.has(entry.id))]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, cloudEntries]);

  useEffect(() => {
    const db = getBrowserSupabase();
    if (!db) return;
    void db.auth.getUser().then(({ data }: { data: { user: { id: string; email?: string } | null } }) => {
      setCloudUser(data.user?.id || null);
      setCloudEmail(data.user?.email || "");
    });
    const { data: listener } = db.auth.onAuthStateChange((_event: string, session: { user: { id: string; email?: string } } | null) => {
      setCloudUser(session?.user.id || null);
      setCloudEmail(session?.user.email || "");
      if (!session) {
        setCloudEntries([]);
        setCloudDrafts([]);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadCloud(userId: string) {
    const db = getBrowserSupabase();
    if (!db) return;
    setCloudStatus("Syncing...");
    const [notes, drafts, voice] = await Promise.all([
      db.from("journal_entries").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(500),
      db.from("content_drafts").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(100),
      db.from("voice_profiles").select("instructions").eq("user_id", userId).maybeSingle(),
    ]);
    if (notes.error || drafts.error || voice.error) {
      setCloudStatus("Cloud sync failed. Check your Supabase setup.");
      return;
    }
    setCloudEntries(((notes.data || []) as CloudJournalRow[]).map(rowToEntry));
    setCloudDrafts((drafts.data || []) as CloudDraft[]);
    setVoiceInstructions(voice.data?.instructions || DEFAULT_VOICE);
    setCloudStatus("Up to date");
  }

  useEffect(() => {
    if (cloudUser) void loadCloud(cloudUser);
  }, [cloudUser, view]);

  async function importLocalJournal() {
    const db = getBrowserSupabase();
    if (!db || !cloudUser || entries.length === 0) return;
    setCloudStatus("Importing...");
    const { error } = await db.from("journal_entries")
      .upsert(entries.map((entry) => entryToRow(entry, cloudUser)), { onConflict: "id" });
    if (error) {
      setCloudStatus("Import failed: " + error.message);
      return;
    }
    setEntries([]);
    await loadCloud(cloudUser);
    setNotice("Your local notes are now in your private cloud journal.");
  }

  async function saveVoiceProfile() {
    const db = getBrowserSupabase();
    if (!db || !cloudUser) return;
    const { error } = await db.from("voice_profiles").upsert({
      user_id: cloudUser,
      instructions: voiceInstructions,
      updated_at: new Date().toISOString(),
    });
    setNotice(error ? "Could not save voice preferences." : "Voice preferences saved.");
  }

  async function saveDraftToCloud() {
    const db = getBrowserSupabase();
    if (!db || !cloudUser || !draft.trim()) return;
    const { error } = await db.from("content_drafts").insert({
      user_id: cloudUser,
      content: draft,
      title: activeEntry?.hook || "My LinkedIn draft",
      tone,
      entry_ids: activeEntry ? [activeEntry.id] : [],
    });
    if (error) {
      setNotice("Draft save failed.");
      return;
    }
    await loadCloud(cloudUser);
    setNotice("Draft saved to Codexiary.");
  }

  function openSavedDraft(item: CloudDraft) {
    setActiveEntry(null);
    setDraft(item.content);
    setTone(["Reflective", "Technical", "Concise"].includes(item.tone) ? item.tone : "Reflective");
    setView("content");
  }

  const weekEntries = useMemo(() => {
    const sevenDays = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return allEntries.filter((entry) => new Date(entry.createdAt).getTime() >= sevenDays);
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allEntries;
    return allEntries.filter((entry) =>
      [
        entry.raw,
        entry.summary,
        entry.project,
        entry.category,
        entry.source,
        entry.topics.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [allEntries, search]);

  const contentIdeas = useMemo(
    () =>
      allEntries
        .map((entry) => ({
          entry,
          score: Math.min(
            98,
            62 +
              Math.min(18, Math.floor(entry.raw.length / 45)) +
              Math.min(12, entry.topics.length * 3),
          ),
        }))
        .sort((a, b) => b.score - a.score),
    [allEntries],
  );

  async function saveCapture() {
    const note = raw.trim();
    if (!note) {
      setNotice("Write or dictate something first.");
      textareaRef.current?.focus();
      return;
    }

    setSaving(true);
    let organized: AIOrganizeResult;

    try {
      const data = await callAI({
        action: "organize",
        note,
        source,
        project,
      });
      organized = data.result;
      setNotice("Captured and organized with AI.");
    } catch {
      organized = localOrganize(note, source);
      setNotice("Captured in local mode.");
    }

    const entry: Entry = {
      id: uid(),
      raw: note,
      source,
      project: project.trim(),
      createdAt: new Date().toISOString(),
      ...organized,
    };

    setEntries((current) => [entry, ...current]);

    // Cloud writes are performed with the signed-in user's RLS identity.
    const db = getBrowserSupabase();
    if (db && cloudUser) {
      const { error } = await db.from("journal_entries").insert(entryToRow(entry, cloudUser));
      if (!error) {
        setCloudEntries((current) => [entry, ...current]);
        setEntries((current) => current.filter((item) => item.id !== entry.id));
      } else {
        setNotice("Saved locally. Cloud sync failed.");
      }
    }
    setRaw("");
    setProject("");
    setSaving(false);
    setView("dashboard");
  }

  async function makeDraft(entry: Entry, toneOverride?: string) {
    const selectedTone = toneOverride ?? tone;
    setActiveEntry(entry);
    setDrafting(true);
    setDraft("");

    try {
      const data = await callAI({
        action: "draft",
        entry,
        tone: selectedTone,
      });
      setDraft(data.result.content);
    } catch {
      setDraft(localDraft(entry, selectedTone));
    } finally {
      setDrafting(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setNotice("Draft copied to clipboard.");
  }

  async function deleteEntry(id: string) {
    if (cloudEntries.some((entry) => entry.id === id)) {
      const db = getBrowserSupabase();
      if (!db || !cloudUser) return;
      const { error } = await db.from("journal_entries").delete().eq("id", id).eq("user_id", cloudUser);
      if (error) {
        setNotice("Cloud deletion failed.");
        return;
      }
      setCloudEntries((current) => current.filter((entry) => entry.id !== id));
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (activeEntry?.id === id) {
      setActiveEntry(null);
      setDraft("");
    }
    setNotice("Entry removed.");
  }

  function clearData() {
    if (!window.confirm("Delete every Codexiary entry stored in this browser?")) return;
    setEntries([]);
    setActiveEntry(null);
    setDraft("");
    localStorage.removeItem(STORAGE_KEY);
    setNotice("Local-only journal cleared. Cloud notes were not deleted.");
  }

  function startVoice() {
    const w = window as typeof window & {
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start: () => void;
        stop: () => void;
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
        onend: () => void;
        onerror: () => void;
      };
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start: () => void;
        stop: () => void;
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
        onend: () => void;
        onerror: () => void;
      };
    };

    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice capture is not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setRaw((current) => (current ? `${current} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice capture could not start.");
    };
    setListening(true);
    recognition.start();
  }

  const displayName =
    view === "dashboard"
      ? "Today"
      : navItems.find((item) => item.id === view)?.label ?? "Codexiary";

  return (
    <main className="app-shell">
      <header className="global-nav">
        <div className="global-nav-inner">
          <button
            className="brand-button"
            onClick={() => setView("dashboard")}
            aria-label="Go to Codexiary home"
          >
            <Brand compact />
          </button>

          <nav className="global-links desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={view === item.id ? "active" : ""}
                  onClick={() => setView(item.id)}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="global-actions">
            <button
              className="global-icon-button desktop-nav"
              onClick={() => setView("journal")}
              aria-label="Search journal"
            >
              <Search size={17} strokeWidth={1.8} />
            </button>
            <button
              className="global-icon-button mobile-menu"
              onClick={() => setMobileNav((open) => !open)}
              aria-label="Open navigation"
            >
              {mobileNav ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div className="subnav">
        <div className="subnav-inner">
          <div className="subnav-title">
            <span>Codexiary</span>
            <small>{displayName}</small>
          </div>

          <div className="subnav-actions">
            <span className="week-note desktop-nav">
              {weekEntries.length} {weekEntries.length === 1 ? "moment" : "moments"} this week
            </span>
            <button className="primary-button" onClick={() => setView("capture")}>
              <Plus size={16} strokeWidth={2} />
              Capture
            </button>
          </div>
        </div>
      </div>

      {mobileNav && (
        <div className="mobile-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => {
                  setView(item.id);
                  setMobileNav(false);
                }}
              >
                <Icon size={17} strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      <section className="workspace">
        <div className="page">
          {view === "dashboard" && (
            <Dashboard
              entries={allEntries}
              weekEntries={weekEntries}
              contentIdeas={contentIdeas}
              raw={raw}
              setRaw={setRaw}
              source={source}
              setSource={setSource}
              project={project}
              setProject={setProject}
              saving={saving}
              saveCapture={saveCapture}
              startVoice={startVoice}
              listening={listening}
              textareaRef={textareaRef}
              setView={setView}
              makeDraft={makeDraft}
            />
          )}

          {view === "capture" && (
            <CapturePage
              raw={raw}
              setRaw={setRaw}
              source={source}
              setSource={setSource}
              project={project}
              setProject={setProject}
              saving={saving}
              saveCapture={saveCapture}
              startVoice={startVoice}
              listening={listening}
              textareaRef={textareaRef}
            />
          )}

          {view === "journal" && (
            <JournalPage
              entries={filteredEntries}
              search={search}
              setSearch={setSearch}
              deleteEntry={deleteEntry}
              makeDraft={makeDraft}
              setView={setView}
            />
          )}

          {view === "content" && (
            <ContentStudio
              ideas={contentIdeas}
              tone={tone}
              setTone={setTone}
              activeEntry={activeEntry}
              draft={draft}
              setDraft={setDraft}
              drafting={drafting}
              makeDraft={makeDraft}
              copyDraft={copyDraft}
              savedDrafts={cloudDrafts}
              onSelectSavedDraft={openSavedDraft}
              saveDraftToCloud={saveDraftToCloud}
              cloudConnected={Boolean(cloudUser)}
            />
          )}

          {view === "settings" && (
            <SettingsPage
              clearData={clearData}
              entries={entries}
              cloudConfigured={isCloudConfigured()}
              cloudEmail={cloudEmail}
              cloudConnected={Boolean(cloudUser)}
              cloudStatus={cloudStatus}
              importLocalJournal={importLocalJournal}
              refreshCloud={() => cloudUser && loadCloud(cloudUser)}
              voiceInstructions={voiceInstructions}
              setVoiceInstructions={setVoiceInstructions}
              saveVoiceProfile={saveVoiceProfile}
              signOut={async () => { await getBrowserSupabase()?.auth.signOut(); }}
            />
          )}
        </div>
      </section>

      {notice && (
        <div className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
    </main>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <NotebookPen size={19} strokeWidth={1.8} aria-hidden="true" />
      <div>
        <strong>Codexiary</strong>
        {!compact && <small>Capture the work. Keep the story.</small>}
      </div>
    </div>
  );
}

type DashboardProps = {
  entries: Entry[];
  weekEntries: Entry[];
  contentIdeas: { entry: Entry; score: number }[];
  raw: string;
  setRaw: (value: string) => void;
  source: string;
  setSource: (value: string) => void;
  project: string;
  setProject: (value: string) => void;
  saving: boolean;
  saveCapture: () => void;
  startVoice: () => void;
  listening: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setView: (view: View) => void;
  makeDraft: (entry: Entry) => void;
};

function Dashboard({
  entries,
  weekEntries,
  contentIdeas,
  raw,
  setRaw,
  source,
  setSource,
  project,
  setProject,
  saving,
  saveCapture,
  startVoice,
  listening,
  textareaRef,
  setView,
  makeDraft,
}: DashboardProps) {
  const ready = contentIdeas.filter((idea) => idea.score >= 74).length;

  return (
    <>
      <section className="hero product-tile product-tile-light">
        <div className="tile-inner hero-inner">
          <div className="hero-mark" aria-hidden="true">
            <NotebookPen size={52} strokeWidth={1.35} />
          </div>
          <p className="eyebrow accent">PERSONAL KNOWLEDGE → USEFUL STORIES</p>
          <h2>
            Capture the work.
            <br />
            Keep the story.
          </h2>
          <p className="hero-copy">
            Codexiary keeps a quiet record of what you build, learn, attend, and
            figure out — then helps you turn the strongest moments into thoughtful
            LinkedIn posts.
          </p>
          <div className="hero-actions">
            <button className="primary-button large" onClick={() => setView("capture")}>
              Capture a moment
            </button>
            <button className="secondary-pill" onClick={() => setView("journal")}>
              Open journal <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="product-tile product-tile-parchment capture-showcase">
        <div className="tile-inner">
          <div className="section-copy centered-copy">
            <p className="eyebrow">QUICK CAPTURE</p>
            <h3>Write it while it is still fresh.</h3>
            <p>
              A rough note is enough. Add where it came from, save it, and let
              Codexiary organize the memory for later.
            </p>
          </div>

          <QuickCapture
            raw={raw}
            setRaw={setRaw}
            source={source}
            setSource={setSource}
            project={project}
            setProject={setProject}
            saving={saving}
            saveCapture={saveCapture}
            startVoice={startVoice}
            listening={listening}
            textareaRef={textareaRef}
          />

          <div className="stats-grid">
            <StatCard
              icon={BookOpen}
              value={entries.length}
              label="moments kept"
              detail="your growing evidence trail"
            />
            <StatCard
              icon={Clock3}
              value={weekEntries.length}
              label="this week"
              detail="small notes are enough"
            />
            <StatCard
              icon={Lightbulb}
              value={ready}
              label="story signals"
              detail="worth revisiting"
            />
          </div>
        </div>
      </section>

      <section className="product-tile product-tile-dark radar-showcase">
        <div className="tile-inner">
          <div className="dark-section-heading">
            <div>
              <p className="eyebrow dark-eyebrow">CONTENT RADAR</p>
              <h3>The best post may already be in your week.</h3>
              <p>
                Codexiary surfaces moments with enough substance to revisit. You
                choose what deserves to become public.
              </p>
            </div>
            <button className="dark-link" onClick={() => setView("content")}>
              Open content studio <ArrowRight size={17} />
            </button>
          </div>

          {contentIdeas.length ? (
            <div className="radar-grid">
              {contentIdeas.slice(0, 3).map(({ entry, score }) => (
                <button
                  className="radar-item"
                  key={entry.id}
                  onClick={() => {
                    makeDraft(entry);
                    setView("content");
                  }}
                >
                  <div className="score-ring">{score}</div>
                  <div>
                    <span className="radar-meta">
                      {entry.category}
                      {entry.project ? ` · ${entry.project}` : ""}
                    </span>
                    <strong>{entry.hook}</strong>
                    <p>{entry.angle}</p>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyMini />
          )}
        </div>
      </section>

      <section className="product-tile product-tile-light recent-showcase">
        <div className="tile-inner">
          <div className="section-copy split-heading">
            <div>
              <p className="eyebrow">RECENT TRAIL</p>
              <h3>Your work, remembered.</h3>
            </div>
            <button className="text-button" onClick={() => setView("journal")}>
              Open journal <ArrowRight size={16} />
            </button>
          </div>

          {entries.length ? (
            <div className="recent-grid">
              {entries.slice(0, 4).map((entry) => (
                <article className="entry-card" key={entry.id}>
                  <div className="entry-meta">
                    <CategoryIcon category={entry.category} />
                    <span>{entry.category}</span>
                    <i />
                    <span>{timeAgo(entry.createdAt)}</span>
                  </div>
                  <h4>{entry.summary}</h4>
                  <div className="tags">
                    {entry.topics.slice(0, 3).map((topic) => (
                      <span key={topic}>{topic}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <PenLine size={24} />
              </div>
              <h4>Your trail starts with one rough note.</h4>
              <p>
                Capture something you built, learned, attended, struggled with,
                or changed your mind about.
              </p>
              <button className="primary-button" onClick={() => setView("capture")}>
                Capture your first moment
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

type CaptureProps = {
  raw: string;
  setRaw: (value: string) => void;
  source: string;
  setSource: (value: string) => void;
  project: string;
  setProject: (value: string) => void;
  saving: boolean;
  saveCapture: () => void;
  startVoice: () => void;
  listening: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

function QuickCapture(props: CaptureProps) {
  return (
    <div className="panel quick-capture">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">QUICK CAPTURE</p>
          <h3>What happened?</h3>
        </div>
        <span className="soft-badge">
          <Sparkles size={13} /> AI-organized
        </span>
      </div>

      <textarea
        ref={props.textareaRef}
        value={props.raw}
        onChange={(event) => props.setRaw(event.target.value)}
        placeholder="e.g. Spent an hour debugging the auth flow today. The issue looked like the API, but the real problem was stale state in the client..."
        rows={5}
      />

      <div className="capture-controls">
        <div className="capture-fields">
          <select
            value={props.source}
            onChange={(event) => props.setSource(event.target.value)}
          >
            {sources.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input
            value={props.project}
            onChange={(event) => props.setProject(event.target.value)}
            placeholder="Project / course (optional)"
          />
        </div>
        <div className="capture-actions">
          <button
            className={`icon-button ${props.listening ? "listening" : ""}`}
            onClick={props.startVoice}
            title="Dictate"
            aria-label="Dictate note"
          >
            <Mic size={18} />
          </button>
          <button
            className="primary-button"
            onClick={props.saveCapture}
            disabled={props.saving}
          >
            {props.saving ? (
              <>
                <span className="spinner" /> Organizing
              </>
            ) : (
              <>
                Save moment <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CapturePage(props: CaptureProps) {
  return (
    <section className="capture-page">
      <div className="capture-intro">
        <p className="eyebrow accent">60-SECOND REFLECTION</p>
        <h2>Do not polish it. Just remember it.</h2>
        <p>
          Write like you are sending yourself a message. The useful structure can
          come later.
        </p>
      </div>

      <div className="panel large-capture">
        <textarea
          ref={props.textareaRef}
          value={props.raw}
          onChange={(event) => props.setRaw(event.target.value)}
          placeholder="What did you work on, learn, struggle with, notice, or change your mind about?"
          rows={12}
          autoFocus
        />

        <div className="prompt-row">
          <span>Try including:</span>
          <button onClick={() => props.setRaw(props.raw + " What I worked on: ")}>
            what you did
          </button>
          <button onClick={() => props.setRaw(props.raw + " The hard part: ")}>
            what was hard
          </button>
          <button onClick={() => props.setRaw(props.raw + " I learned: ")}>
            what you learned
          </button>
        </div>

        <div className="form-grid">
          <label>
            <span>Source</span>
            <select
              value={props.source}
              onChange={(event) => props.setSource(event.target.value)}
            >
              {sources.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Project / course</span>
            <input
              value={props.project}
              onChange={(event) => props.setProject(event.target.value)}
              placeholder="DevDoc AI, CPE 401, PAMA..."
            />
          </label>
        </div>

        <div className="large-capture-footer">
          <button
            className={`secondary-button ${props.listening ? "listening" : ""}`}
            onClick={props.startVoice}
          >
            <Mic size={17} />
            {props.listening ? "Listening..." : "Speak instead"}
          </button>
          <button
            className="primary-button"
            onClick={props.saveCapture}
            disabled={props.saving}
          >
            {props.saving ? (
              <>
                <span className="spinner" /> Organizing
              </>
            ) : (
              <>
                Save & organize <Sparkles size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="privacy-note">
        <div className="privacy-dot" />
        <p>
          Notes stay in this browser unless you sign in for private cloud sync.
          OpenAI API access remains optional for in-app generation.
        </p>
      </div>
    </section>
  );
}

function JournalPage({
  entries,
  search,
  setSearch,
  deleteEntry,
  makeDraft,
  setView,
}: {
  entries: Entry[];
  search: string;
  setSearch: (value: string) => void;
  deleteEntry: (id: string) => void;
  makeDraft: (entry: Entry, toneOverride?: string) => void;
  setView: (view: View) => void;
}) {
  return (
    <section>
      <div className="section-title">
        <div>
          <p className="eyebrow accent">YOUR EVIDENCE TRAIL</p>
          <h2>Journal</h2>
          <p>Search what you have built, learned, noticed, and figured out.</p>
        </div>
        <div className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search moments..."
          />
        </div>
      </div>

      {entries.length ? (
        <div className="journal-list">
          {entries.map((entry) => (
            <article className="journal-card" key={entry.id}>
              <div className="journal-date">
                <strong>
                  {new Date(entry.createdAt).toLocaleDateString("en", {
                    day: "2-digit",
                  })}
                </strong>
                <span>
                  {new Date(entry.createdAt)
                    .toLocaleDateString("en", { month: "short" })
                    .toUpperCase()}
                </span>
              </div>

              <div className="journal-body">
                <div className="entry-meta">
                  <CategoryIcon category={entry.category} />
                  <span>{entry.category}</span>
                  <i />
                  <span>{entry.source}</span>
                  {entry.project && (
                    <>
                      <i />
                      <span>{entry.project}</span>
                    </>
                  )}
                </div>
                <h3>{entry.summary}</h3>
                <p className="raw-note">{entry.raw}</p>

                <div className="lesson-box">
                  <Lightbulb size={16} />
                  <div>
                    <strong>Lesson kept</strong>
                    <span>{entry.lesson}</span>
                  </div>
                </div>

                <div className="journal-footer">
                  <div className="tags">
                    {entry.topics.map((topic) => (
                      <span key={topic}>{topic}</span>
                    ))}
                  </div>
                  <div>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        makeDraft(entry);
                        setView("content");
                      }}
                    >
                      <Sparkles size={15} /> Draft
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => deleteEntry(entry.id)}
                      aria-label="Delete entry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state panel">
          <BookOpen size={28} />
          <h3>No matching moments yet.</h3>
          <p>Try another search or capture something new.</p>
        </div>
      )}
    </section>
  );
}

function ContentStudio({
  ideas,
  tone,
  setTone,
  activeEntry,
  draft,
  setDraft,
  drafting,
  makeDraft,
  copyDraft,
  savedDrafts,
  onSelectSavedDraft,
  saveDraftToCloud,
  cloudConnected,
}: {
  ideas: { entry: Entry; score: number }[];
  tone: string;
  setTone: (value: string) => void;
  activeEntry: Entry | null;
  draft: string;
  setDraft: (value: string) => void;
  drafting: boolean;
  makeDraft: (entry: Entry, toneOverride?: string) => void;
  copyDraft: () => void;
  savedDrafts: CloudDraft[];
  onSelectSavedDraft: (draft: CloudDraft) => void;
  saveDraftToCloud: () => void;
  cloudConnected: boolean;
}) {
  return (
    <section>
      <div className="section-title">
        <div>
          <p className="eyebrow accent">FROM MEMORY TO MESSAGE</p>
          <h2>Content studio</h2>
          <p>
            Pick the experience first. The post should come from evidence, not a
            blank prompt.
          </p>
        </div>
      </div>

      <div className="studio-grid">
        <div className="ideas-column">
          {cloudConnected && (
            <div className="saved-drafts">
              <div className="studio-label"><span>Saved drafts from ChatGPT</span><small>{savedDrafts.length}</small></div>
              {savedDrafts.length ? savedDrafts.slice(0, 8).map((item) => (
                <button key={item.id} className="saved-draft-item" onClick={() => onSelectSavedDraft(item)}>
                  <FileText size={16} />
                  <span>{item.title || item.content.slice(0, 75)}</span>
                  <ChevronRight size={15} />
                </button>
              )) : <p className="sync-muted">Drafts saved through ChatGPT will appear here.</p>}
            </div>
          )}
          <div className="studio-label">
            <span>Story signals</span>
            <small>{ideas.length} found</small>
          </div>

          {ideas.length ? (
            ideas.map(({ entry, score }) => (
              <button
                className={`idea-card ${activeEntry?.id === entry.id ? "selected" : ""}`}
                key={entry.id}
                onClick={() => makeDraft(entry)}
              >
                <div className="idea-top">
                  <span className="soft-badge">{entry.category}</span>
                  <span className="idea-score">{score}% signal</span>
                </div>
                <h3>{entry.hook}</h3>
                <p>{entry.angle}</p>
                <div className="idea-bottom">
                  <span>{formatDate(entry.createdAt)}</span>
                  <span>
                    Draft story <ArrowRight size={14} />
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="panel empty-state compact-empty">
              <Lightbulb size={24} />
              <h3>No story signals yet.</h3>
              <p>Capture a few moments first. Codexiary will surface the patterns.</p>
            </div>
          )}
        </div>

        <div className="draft-column panel">
          <div className="draft-header">
            <div>
              <p className="eyebrow">DRAFT WORKBENCH</p>
              <h3>{activeEntry ? "Shape the story" : "Choose a story signal"}</h3>
            </div>
            {draft && (
              <button className="ghost-button" onClick={copyDraft}>
                <Clipboard size={15} /> Copy
              </button>
            )}
          </div>

          <div className="tone-row">
            {["Reflective", "Technical", "Concise"].map((option) => (
              <button
                key={option}
                className={tone === option ? "active" : ""}
                onClick={() => {
                  setTone(option);
                  if (activeEntry) {
                    makeDraft(activeEntry, option);
                  }
                }}
              >
                {option}
              </button>
            ))}
          </div>

          {drafting ? (
            <div className="draft-loading">
              <div className="ai-loader">
                <span />
                <span />
                <span />
              </div>
              <strong>Finding the story inside the note...</strong>
              <p>Keeping it factual, useful, and close to your voice.</p>
            </div>
          ) : draft ? (
            <>
              <textarea
                className="draft-editor"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={20}
              />
              <div className="draft-footer">
                <span>{draft.length} characters</span>
                {cloudConnected && <button className="secondary-button" onClick={saveDraftToCloud}>
                  <BookOpen size={15} /> Save draft
                </button>}
                <button className="primary-button" onClick={copyDraft}>
                  <Clipboard size={15} /> Copy for LinkedIn
                </button>
              </div>
            </>
          ) : (
            <div className="draft-placeholder">
              <div className="draft-placeholder-icon">
                <FileText size={28} />
              </div>
              <h3>No blank-page anxiety here.</h3>
              <p>
                Choose a real moment on the left. Codexiary will turn its facts and
                lesson into a draft you can still edit.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SettingsPage({
  clearData,
  entries,
  cloudConfigured,
  cloudEmail,
  cloudConnected,
  cloudStatus,
  importLocalJournal,
  refreshCloud,
  voiceInstructions,
  setVoiceInstructions,
  saveVoiceProfile,
  signOut,
}: {
  clearData: () => void;
  entries: Entry[];
  cloudConfigured: boolean;
  cloudEmail: string;
  cloudConnected: boolean;
  cloudStatus: string;
  importLocalJournal: () => void;
  refreshCloud: () => void;
  voiceInstructions: string;
  setVoiceInstructions: (value: string) => void;
  saveVoiceProfile: () => void;
  signOut: () => void;
}) {
  return (
    <section>
      <div className="section-title">
        <div>
          <p className="eyebrow accent">WORKSPACE</p>
          <h2>Settings</h2>
          <p>V1 keeps the setup deliberately small.</p>
        </div>
      </div>

      <div className="panel cloud-panel">
        <div className="setting-icon"><Github size={20} /></div>
        <div className="cloud-panel-content">
          <h3>ChatGPT connection and private cloud journal</h3>
          <p>{!cloudConfigured ? "Cloud sync isn't configured yet. The local journal still works." :
            cloudConnected ? `Connected as ${cloudEmail || "your account"}. ${cloudStatus}` :
            "Sign in to connect ChatGPT to a private Supabase journal. Your local notes remain unchanged."}</p>
          <div className="cloud-actions">
            {cloudConfigured && !cloudConnected && <a className="primary-button" href="/login">Sign in to cloud</a>}
            {cloudConnected && <>
              <button className="secondary-button" onClick={refreshCloud}>Refresh from ChatGPT</button>
              <button className="secondary-button" onClick={importLocalJournal} disabled={!entries.length}>Import {entries.length} local notes</button>
              <button className="secondary-button" onClick={signOut}>Sign out</button>
            </>}
            <a href="/mcp-guide" className="secondary-button">Connection guide <ArrowRight size={15}/></a>
          </div>
          {cloudConnected && (
            <div className="voice-settings">
              <label htmlFor="voice-profile">Your LinkedIn writing voice</label>
              <textarea id="voice-profile" rows={4} value={voiceInstructions} onChange={(event) => setVoiceInstructions(event.target.value)} />
              <button className="primary-button" onClick={saveVoiceProfile}>Save writing voice</button>
            </div>
          )}
        </div>
      </div>
      <div className="settings-grid">
        <div className="panel setting-card">
          <div className="setting-icon">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h3>OpenAI enhancement</h3>
            <p>
              Add <code>OPENAI_API_KEY</code> in Vercel to enable AI organization
              and drafting. Without it, Codexiary stays fully usable with local
              fallback logic.
            </p>
            <span className="status-pill">Optional in V1</span>
          </div>
        </div>

        <div className="panel setting-card">
          <div className="setting-icon">
            <Github size={20} />
          </div>
          <div>
            <h3>GitHub integration</h3>
            <p>
              Coming later: detect meaningful project activity and ask you for the
              human story behind the code instead of turning every commit into a
              post.
            </p>
            <span className="status-pill muted">Next milestone</span>
          </div>
        </div>

        <div className="panel setting-card danger-card">
          <div className="setting-icon">
            <Trash2 size={20} />
          </div>
          <div>
            <h3>Local journal</h3>
            <p>
              {entries.length} {entries.length === 1 ? "entry" : "entries"} stored
              only in this browser. Cloud-synced entries will not be deleted here.
            </p>
            <button className="danger-button" onClick={clearData}>
              Clear local data
            </button>
          </div>
        </div>
      </div>

      <div className="roadmap panel">
        <div>
          <p className="eyebrow">NEXT BUILDS</p>
          <h3>Where Codexiary goes from here</h3>
        </div>
        <div className="roadmap-steps">
          <RoadmapStep
            number="01"
            title="Persistent account + cloud journal"
            text="Move browser-only entries into Convex or Supabase and add authentication."
          />
          <RoadmapStep
            number="02"
            title="GitHub activity signals"
            text="Cluster meaningful commits and PRs, then ask short reflection questions."
          />
          <RoadmapStep
            number="03"
            title="Files, lectures & assignments"
            text="Upload notes or course material and attach your own reflections to the source."
          />
          <RoadmapStep
            number="04"
            title="Weekly reflection"
            text="Surface the week’s strongest patterns and prepare a calm two-post content queue."
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  detail,
}: {
  icon: typeof BookOpen;
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const Icon =
    category === "Building"
      ? PenLine
      : category === "Learning"
        ? GraduationCap
        : category === "AI & Engineering"
          ? BrainCircuit
          : category === "Career"
            ? FileText
            : Lightbulb;

  return <Icon size={15} />;
}

function EmptyMini() {
  return (
    <div className="empty-mini">
      <Lightbulb size={22} />
      <strong>No story signals yet</strong>
      <span>Capture a few real moments and they will appear here.</span>
    </div>
  );
}

function RoadmapStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="roadmap-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
