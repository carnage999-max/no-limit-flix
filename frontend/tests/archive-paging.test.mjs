import test from 'node:test';
import assert from 'node:assert/strict';

const { collectFreshIdentifiers } = await import('../src/lib/archive-paging.ts');

// Fake archive of 250 films: film-000 ... film-249, served 100 per page.
const archive = Array.from({ length: 250 }, (_, i) => `film-${String(i).padStart(3, '0')}`);
const search = async (_query, rows, page) => archive.slice((page - 1) * rows, page * rows);
const knownSet = (ids) => async (batch) => new Set(batch.filter((id) => ids.has(id)));

test('skips films already in the library instead of returning page one again', async () => {
  const known = new Set(archive.slice(0, 120));
  const result = await collectFreshIdentifiers({
    query: 'q', limit: 5, startPage: 1, search, findKnown: knownSet(known),
  });

  assert.deepEqual(result.identifiers, ['film-120', 'film-121', 'film-122', 'film-123', 'film-124']);
  assert.equal(result.skippedExisting, 120);
  // Page 2 still holds unclaimed new films, so the cursor must stay on it.
  assert.equal(result.nextPage, 2);
  assert.equal(result.exhausted, false);
});

test('advances the cursor when a page is fully consumed', async () => {
  const result = await collectFreshIdentifiers({
    query: 'q', limit: 100, startPage: 1, search, findKnown: knownSet(new Set()),
  });

  assert.equal(result.identifiers.length, 100);
  assert.equal(result.nextPage, 2);
});

test('reports exhausted once the search runs out of results', async () => {
  const result = await collectFreshIdentifiers({
    query: 'q', limit: 50, startPage: 3, search, findKnown: knownSet(new Set(archive.slice(200))),
  });

  assert.deepEqual(result.identifiers, []);
  assert.equal(result.skippedExisting, 50);
  assert.equal(result.exhausted, true);
});

test('stops scanning after the per-request page cap', async () => {
  const infinite = async (_q, rows, page) => Array.from({ length: rows }, (_, i) => `p${page}-${i}`);
  const result = await collectFreshIdentifiers({
    query: 'q', limit: 1, startPage: 1, search: infinite,
    findKnown: async (batch) => new Set(batch),
  });

  assert.deepEqual(result.identifiers, []);
  assert.equal(result.skippedExisting, 2000);
  assert.equal(result.nextPage, 21);
  assert.equal(result.exhausted, false);
});

const { collectFreshDocs } = await import('../src/lib/archive-paging.ts');

const docsArchive = archive.map((identifier) => ({ identifier, title: identifier, year: null }));
const searchDocs = async (_query, rows, page) => docsArchive.slice((page - 1) * rows, page * rows);
const knownDocs = (ids) => async (batch) => new Set(batch.map((d) => d.identifier).filter((id) => ids.has(id)));

test('collectFreshDocs resumes exactly after the last film it returned', async () => {
  const first = await collectFreshDocs({
    query: 'q', limit: 30, startPage: 1, search: searchDocs, findKnown: knownDocs(new Set(['film-001'])),
  });
  assert.equal(first.docs.length, 30);
  assert.equal(first.docs[0].identifier, 'film-000');
  assert.equal(first.docs[1].identifier, 'film-002');
  assert.equal(first.skippedExisting, 1);

  const second = await collectFreshDocs({
    query: 'q', limit: 5, startPage: first.nextPage, startOffset: first.nextOffset,
    search: searchDocs, findKnown: knownDocs(new Set()),
  });
  assert.deepEqual(second.docs.map((d) => d.identifier), ['film-031', 'film-032', 'film-033', 'film-034', 'film-035']);
});

test('collectFreshDocs rolls over to the next page and reports exhaustion', async () => {
  const result = await collectFreshDocs({
    query: 'q', limit: 500, startPage: 2, startOffset: 90, search: searchDocs, findKnown: knownDocs(new Set()),
  });

  assert.equal(result.docs.length, 250 - 190);
  assert.equal(result.docs[0].identifier, 'film-190');
  assert.equal(result.exhausted, true);
});
