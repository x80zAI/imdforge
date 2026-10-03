import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, ArrowCounterClockwise, ArrowUpRight, Check, DownloadSimple, Lightbulb, Plus, WarningCircle } from '@phosphor-icons/react';
import { addIdea, archiveIdea, IDEA_CATEGORIES, IDEA_LIMIT, loadIdeas, restoreIdea, saveIdeas, serializeIdeas, toggleIdeaSupport } from '../lib/ideas';
import type { Idea, IdeasDocument, IdeaStorage } from '../lib/ideas';
import '../styles/tools.css';

function browserStorage(): IdeaStorage | null {
  try { return window.localStorage; } catch { return null; }
}

function startingBoard() {
  const storage = browserStorage();
  return { ...loadIdeas(storage), storage };
}

export default function Community() {
  const formId = useId();
  const [initial] = useState(startingBoard);
  const [document, setDocument] = useState(initial.document);
  const [storageMessage, setStorageMessage] = useState(initial.message);
  const [canPersist, setCanPersist] = useState(initial.canPersist);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Tools');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const activeIdeas = document.ideas.filter(idea => idea.deletedAt === null);
  const archivedIdeas = document.ideas.filter(idea => idea.deletedAt !== null);

  function updateBoard(next: IdeasDocument, message: string) {
    setDocument(next);
    setActionMessage(message);
    if (canPersist && initial.storage) {
      const issue = saveIdeas(initial.storage, next);
      if (issue) { setStorageMessage(issue); setCanPersist(false); }
    }
  }

  function submitIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = addIdea(document, { title, description, category }, crypto.randomUUID(), new Date().toISOString());
      updateBoard(next, 'Your idea was added to this browser’s board.');
      setTitle('');
      setDescription('');
      setFormError(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'This idea could not be added. Please try again.');
    }
  }

  function exportBoard() {
    try {
      const url = URL.createObjectURL(new Blob([serializeIdeas(document)], { type: 'application/json' }));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `imdforge-ideas-${new Date().toISOString().slice(0, 10)}.json`;
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setActionMessage('Your board export was prepared, including archived ideas and your local support choices.');
    } catch {
      setActionMessage('The export could not be prepared. Your ideas are still visible on this page.');
    }
  }

  function renderIdea(idea: Idea, archived = false) {
    return <article className={`idea-card${archived ? ' idea-card-archived' : ''}`} key={idea.id}>
      <div className="idea-card-meta"><span>{idea.category}</span><span>{archived ? 'ARCHIVED' : 'YOUR LOCAL IDEA'}</span></div>
      <h3>{idea.title}</h3><p>{idea.description}</p>
      <div className="idea-card-actions">
        {archived ? <button type="button" onClick={() => updateBoard(restoreIdea(document, idea.id), 'Your idea was restored to the board.')}><ArrowCounterClockwise size={16} aria-hidden="true" /> Restore idea</button> : <>
          <button className={idea.supported ? 'idea-supported' : ''} type="button" aria-pressed={idea.supported} onClick={() => updateBoard(toggleIdeaSupport(document, idea.id), idea.supported ? 'Your local support was removed.' : 'Your support was saved in this browser.')}>
            {idea.supported ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} {idea.supported ? 'Supported by you' : 'Support locally'}
          </button>
          <button className="idea-archive-button" type="button" aria-label={`Archive idea: ${idea.title}`} onClick={() => updateBoard(archiveIdea(document, idea.id, new Date().toISOString()), 'Idea archived. You can restore it from the archive below.')}><Archive size={18} aria-hidden="true" /></button>
        </>}
      </div>
    </article>;
  }

  return (
    <section className="community-section" id="community" aria-labelledby="community-title">
      <div className="community-heading">
        <div><p className="eyebrow"><Lightbulb size={15} aria-hidden="true" /> COMMUNITY WORKSHOP</p><h1 className="section-title" id="community-title">Better ideas.<br /><span>Forged together.</span></h1></div>
        <p className="community-intro">Build the next useful thing for IMD. Keep your ideas in a personal board and develop a direction for the community.</p>
      </div>
      <div className="community-grid">
        <div className="community-board">
          <div className="community-local-heading"><div><h2>Your idea board</h2><p>{activeIdeas.length} active · {archivedIdeas.length} archived · stored in this browser</p></div><button type="button" className="community-export-button" onClick={exportBoard} aria-label="Export your local idea board as JSON"><DownloadSimple size={16} aria-hidden="true" /> Export</button></div>
          {activeIdeas.length > 0 ? <div className="community-ideas">{activeIdeas.map(idea => renderIdea(idea))}</div> : <div className="community-empty"><Lightbulb size={26} weight="light" aria-hidden="true" /><div><h3>A blank page is a good beginning.</h3><p>Add your first idea. It stays on your device and is never published automatically.</p></div></div>}
          {archivedIdeas.length > 0 && <div className="community-archive"><button type="button" className="community-archive-toggle" onClick={() => setShowArchive(!showArchive)} aria-expanded={showArchive} aria-controls={`${formId}-archive`}><Archive size={15} aria-hidden="true" /> {showArchive ? 'Hide' : 'Show'} archive ({archivedIdeas.length})</button>{showArchive && <div id={`${formId}-archive`} className="community-ideas">{archivedIdeas.map(idea => renderIdea(idea, true))}</div>}</div>}
        </div>
        <div className="panel community-compose">
          <div className="community-compose-heading"><span className="community-compose-icon"><Plus size={22} aria-hidden="true" /></span><div><h2>Start with an idea</h2><p>Small improvements can go a long way.</p></div></div>
          <form onSubmit={submitIdea} aria-describedby={formError ? `${formId}-error` : undefined}>
            <div className="community-field"><label htmlFor={`${formId}-title`}>Give it a title</label><input id={`${formId}-title`} type="text" value={title} onChange={event => setTitle(event.target.value)} minLength={8} maxLength={72} required placeholder="What could we make better?" /></div>
            <div className="community-field"><label htmlFor={`${formId}-category`}>Choose a direction</label><select id={`${formId}-category`} value={category} onChange={event => setCategory(event.target.value)}>{IDEA_CATEGORIES.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
            <div className="community-field"><label htmlFor={`${formId}-description`}>Describe the idea</label><textarea id={`${formId}-description`} rows={5} value={description} onChange={event => setDescription(event.target.value)} minLength={20} maxLength={600} required placeholder="The problem, your idea, and who it helps…" /><div className="community-character-count">{description.length}/600</div></div>
            {formError && <p className="community-form-error" id={`${formId}-error`} role="alert">{formError}</p>}
            <button className="button community-submit" type="submit" disabled={document.ideas.length >= IDEA_LIMIT}>Add to my board <ArrowUpRight size={17} aria-hidden="true" /></button>
          </form>
          <p className="community-compose-note">{document.ideas.length}/{IDEA_LIMIT} ideas, including archived ideas. Supports are personal bookmarks, not community votes.</p>
        </div>
      </div>
      {storageMessage && <p className="community-storage-notice" role="alert"><WarningCircle size={18} aria-hidden="true" /><span>{storageMessage}</span></p>}
      {actionMessage && <p className="community-action-message" role="status">{actionMessage}</p>}
      <p className="community-disclaimer">A local workshop, not on-chain governance. Ideas and support choices are saved only in this browser. They can be lost if browser data is cleared. Export a copy to keep a backup.</p>
    </section>
  );
}
