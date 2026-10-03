import { describe, expect, it, vi } from 'vitest';
import { addIdea, archiveIdea, emptyIdeasDocument, IDEAS_STORAGE_KEY, loadIdeas, parseIdeasDocument, restoreIdea, saveIdeas, serializeIdeas, toggleIdeaSupport, validateIdeaDraft } from '../src/lib/ideas';
import type { IdeasDocument } from '../src/lib/ideas';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const now = '2026-10-03T08:00:00.000Z';
const later = '2026-10-03T09:00:00.000Z';
const draft = { title: 'A clearer retirement trail', description: 'Show each step of token retirement with an accessible, easy to follow explanation.', category: 'Tools' };
const board = () => addIdea(emptyIdeasDocument(), draft, id, now);

describe('personal idea board', () => {
  it('normalizes a draft and creates a versioned local document', () => {
    const document = addIdea(emptyIdeasDocument(), { ...draft, title: `  ${draft.title}  ` }, id, now);
    expect(document.schemaVersion).toBe(1);
    expect(document.ideas[0]).toMatchObject({ title: draft.title, supported: false, deletedAt: null });
    expect(parseIdeasDocument(serializeIdeas(document))).toEqual(document);
  });

  it('makes personal support reversible without inventing global vote counts', () => {
    const supported = toggleIdeaSupport(board(), id);
    expect(supported.ideas[0].supported).toBe(true);
    expect(toggleIdeaSupport(supported, id).ideas[0].supported).toBe(false);
    expect(Object.keys(supported.ideas[0])).not.toContain('votes');
  });

  it('archives and restores all content, including the local support choice', () => {
    const supported = toggleIdeaSupport(board(), id);
    const archived = archiveIdea(supported, id, later);
    expect(archived.ideas[0].deletedAt).toBe(later);
    expect(toggleIdeaSupport(archived, id)).toEqual(archived);
    expect(restoreIdea(parseIdeasDocument(serializeIdeas(archived)), id)).toEqual(supported);
  });

  it('caps the complete board, including recoverable archived ideas', () => {
    let document: IdeasDocument = emptyIdeasDocument();
    for (let index = 0; index < 30; index++) {
      document = addIdea(document, draft, `${index.toString(16).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`, now);
    }
    document = archiveIdea(document, document.ideas[0].id, later);
    expect(() => addIdea(document, draft, id, now)).toThrow('up to 30 ideas');
    expect(parseIdeasDocument(serializeIdeas(document)).ideas).toHaveLength(30);
  });

  it.each([
    { ...draft, title: 'tiny' },
    { ...draft, title: 'x'.repeat(73) },
    { ...draft, description: 'too short' },
    { ...draft, description: 'x'.repeat(601) },
    { ...draft, category: 'Treasury transfer' },
    { ...draft, title: 'An idea\nwith a line break' },
  ])('rejects an invalid draft', input => {
    expect(() => validateIdeaDraft(input)).toThrow();
  });

  it('preserves ordinary HTML-looking content as plain text', () => {
    const html = { ...draft, title: '<script>an idea</script>', description: '<img src=x onerror=alert(1)> This is text, never markup.' };
    expect(addIdea(emptyIdeasDocument(), html, id, now).ideas[0].description).toBe(html.description);
  });
});

describe('saved board validation', () => {
  it.each([
    '{not JSON',
    JSON.stringify({ schemaVersion: 2, ideas: [] }),
    JSON.stringify({ schemaVersion: 1, ideas: [] , votes: 999 }),
    '{"schemaVersion":1,"ideas":[],"__proto__":{"polluted":true}}',
    JSON.stringify({ schemaVersion: 1, ideas: [{ ...board().ideas[0], id: '__proto__' }] }),
    JSON.stringify({ schemaVersion: 1, ideas: [{ ...board().ideas[0], supported: 999 }] }),
    JSON.stringify({ schemaVersion: 1, ideas: [{ ...board().ideas[0], createdAt: '2026-02-30T08:00:00.000Z' }] }),
    JSON.stringify({ schemaVersion: 1, ideas: [{ ...board().ideas[0], deletedAt: '2026-10-02T08:00:00.000Z' }] }),
    JSON.stringify({ schemaVersion: 1, ideas: [board().ideas[0], board().ideas[0]] }),
    ' '.repeat(60_001),
  ])('rejects malformed data or schema injection', raw => {
    expect(() => parseIdeasDocument(raw)).toThrow();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('leaves an unreadable saved board untouched', () => {
    const storage = { getItem: vi.fn(() => '{invalid'), setItem: vi.fn() };
    const result = loadIdeas(storage);
    expect(result.document.ideas).toEqual([]);
    expect(result.canPersist).toBe(false);
    expect(result.message).toContain('left untouched');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('opens a new browser board without prefilling ideas or support choices', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    const result = loadIdeas(storage);
    expect(result).toEqual({ document: { schemaVersion: 1, ideas: [] }, canPersist: true, message: null });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('reports storage denial rather than claiming ideas were saved', () => {
    const storage = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Quota'); } };
    expect(loadIdeas(storage).canPersist).toBe(false);
    expect(loadIdeas(null).message).toContain('unavailable');
    expect(saveIdeas(storage, board())).toContain('could not save');
  });

  it('saves and reloads a complete document under the versioned key', () => {
    const storage = { getItem: vi.fn(() => serializeIdeas(board())), setItem: vi.fn() };
    expect(saveIdeas(storage, board())).toBeNull();
    expect(storage.setItem).toHaveBeenCalledWith(IDEAS_STORAGE_KEY, serializeIdeas(board()));
    expect(loadIdeas(storage)).toMatchObject({ document: board(), canPersist: true, message: null });
  });
});
