export const IDEAS_STORAGE_KEY = 'imdforge.ideas.v1';
export const IDEA_LIMIT = 30;
export const IDEA_CATEGORIES = ['Mechanics', 'Community', 'Tools'] as const;
export type IdeaCategory = typeof IDEA_CATEGORIES[number];

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  createdAt: string;
  supported: boolean;
  deletedAt: string | null;
}

export interface IdeasDocument {
  schemaVersion: 1;
  ideas: Idea[];
}

export interface IdeaDraft {
  title: string;
  description: string;
  category: string;
}

export interface IdeaStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface IdeasLoadResult {
  document: IdeasDocument;
  canPersist: boolean;
  message: string | null;
}

export function emptyIdeasDocument(): IdeasDocument {
  return { schemaVersion: 1, ideas: [] };
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every(key => expected.includes(key));
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function containsControlCharacters(value: string, allowNewlines = false): boolean {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return (code < 32 && !(allowNewlines && code === 10)) || code === 127;
  });
}

export function validateIdeaDraft(draft: IdeaDraft): { title: string; description: string; category: IdeaCategory } {
  const title = draft.title.trim();
  const description = draft.description.trim();
  if (title.length < 8 || title.length > 72 || containsControlCharacters(title)) {
    throw new Error('Write a title between 8 and 72 characters on one line.');
  }
  if (description.length < 20 || description.length > 600 || containsControlCharacters(description, true)) {
    throw new Error('Describe your idea in 20 to 600 characters.');
  }
  if (!IDEA_CATEGORIES.includes(draft.category as IdeaCategory)) throw new Error('Choose a category from the list.');
  return { title, description, category: draft.category as IdeaCategory };
}

export function parseIdeasDocument(raw: string): IdeasDocument {
  if (raw.length > 60_000) throw new Error('The saved board is too large.');
  const value: unknown = JSON.parse(raw);
  if (!plainRecord(value) || !hasExactKeys(value, ['schemaVersion', 'ideas']) || value.schemaVersion !== 1 || !Array.isArray(value.ideas) || value.ideas.length > IDEA_LIMIT) {
    throw new Error('The saved board format is not supported.');
  }
  const identifiers = new Set<string>();
  const ideas: Idea[] = value.ideas.map((item: unknown) => {
    if (!plainRecord(item) || !hasExactKeys(item, ['id', 'title', 'description', 'category', 'createdAt', 'supported', 'deletedAt'])) throw new Error('A saved idea is incomplete.');
    if (typeof item.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(item.id) || identifiers.has(item.id)) throw new Error('A saved idea has an invalid identifier.');
    if (typeof item.title !== 'string' || typeof item.description !== 'string' || typeof item.category !== 'string') throw new Error('A saved idea has invalid text.');
    if (!validDate(item.createdAt) || typeof item.supported !== 'boolean' || !(item.deletedAt === null || validDate(item.deletedAt))) throw new Error('A saved idea has invalid details.');
    if (item.deletedAt !== null && item.deletedAt < item.createdAt) throw new Error('A saved idea has an invalid archive date.');
    const draft = validateIdeaDraft({ title: item.title, description: item.description, category: item.category });
    identifiers.add(item.id);
    return { id: item.id, ...draft, createdAt: item.createdAt, supported: item.supported, deletedAt: item.deletedAt };
  });
  return { schemaVersion: 1, ideas };
}

export function loadIdeas(storage: IdeaStorage | null): IdeasLoadResult {
  if (storage === null) return { document: emptyIdeasDocument(), canPersist: false, message: 'Browser storage is unavailable. This board lasts for this page session; export a copy to keep it.' };
  try {
    const raw = storage.getItem(IDEAS_STORAGE_KEY);
    return { document: raw === null ? emptyIdeasDocument() : parseIdeasDocument(raw), canPersist: true, message: null };
  } catch {
    return { document: emptyIdeasDocument(), canPersist: false, message: 'Your saved board could not be read. It has been left untouched. New ideas last for this page session; export a copy to keep them.' };
  }
}

export function saveIdeas(storage: IdeaStorage, document: IdeasDocument): string | null {
  try {
    storage.setItem(IDEAS_STORAGE_KEY, serializeIdeas(document));
    return null;
  } catch {
    return 'Your browser could not save this change. It remains on this page; export a copy before leaving.';
  }
}

export function serializeIdeas(document: IdeasDocument): string {
  // Validate exports as well, so an unsupported or corrupted document is never written.
  const valid = parseIdeasDocument(JSON.stringify(document));
  return JSON.stringify(valid, null, 2);
}

export function addIdea(document: IdeasDocument, draft: IdeaDraft, id: string, now: string): IdeasDocument {
  if (document.ideas.length >= IDEA_LIMIT) throw new Error('This browser holds up to 30 ideas, including archived ideas. Export a copy of your board to keep it.');
  const input = validateIdeaDraft(draft);
  const next: IdeasDocument = { schemaVersion: 1, ideas: [{ ...input, id, createdAt: now, supported: false, deletedAt: null }, ...document.ideas] };
  return parseIdeasDocument(JSON.stringify(next));
}

export function toggleIdeaSupport(document: IdeasDocument, id: string): IdeasDocument {
  return { ...document, ideas: document.ideas.map(idea => idea.id === id && idea.deletedAt === null ? { ...idea, supported: !idea.supported } : idea) };
}

export function archiveIdea(document: IdeasDocument, id: string, now: string): IdeasDocument {
  if (!validDate(now)) throw new Error('The archive date is invalid.');
  return { ...document, ideas: document.ideas.map(idea => idea.id === id && idea.deletedAt === null ? { ...idea, deletedAt: now < idea.createdAt ? idea.createdAt : now } : idea) };
}

export function restoreIdea(document: IdeasDocument, id: string): IdeasDocument {
  return { ...document, ideas: document.ideas.map(idea => idea.id === id ? { ...idea, deletedAt: null } : idea) };
}
