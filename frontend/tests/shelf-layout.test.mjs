import test from 'node:test';
import assert from 'node:assert/strict';

const { buildStoreShelves } = await import('../src/components/store3d/data/shelfLayout.ts');
const { GENRE_SIGN_SPOTS } = await import('../src/components/store3d/data/layout.ts');

const movie = (id, genreBucket) => ({
  id,
  title: `Film ${id}`,
  year: 1950,
  rating: 'NR',
  duration: '1h 20m',
  stars: 0,
  genre: genreBucket,
  genreBucket,
  description: '',
  posterUrl: null,
  colorFrom: '#000',
  colorTo: '#000',
  accent: '#fff',
});

const library = (counts) =>
  Object.entries(counts).flatMap(([genre, n]) =>
    Array.from({ length: n }, (_, i) => movie(`${genre}-${i}`, genre))
  );

test('a movie is never repeated, on a shelf or anywhere in the store', () => {
  // Far fewer films than slots: the old code wrapped around and papered a whole shelf with one title.
  const { placements } = buildStoreShelves(library({ Drama: 3, Comedy: 2, Horror: 1 }));

  const ids = placements.map((p) => p.movie.id);
  assert.equal(new Set(ids).size, ids.length, 'the same movie was placed more than once');
  assert.equal(ids.length, 6, 'every film should be shelved exactly once');
});

test('leftover shelf space stays empty instead of being padded', () => {
  const { placements } = buildStoreShelves(library({ Drama: 4 }));
  assert.equal(placements.length, 4);
});

test('each sign names the genre actually stocked on the shelf beneath it', () => {
  const counts = { Drama: 40, Comedy: 30, Horror: 20, Western: 10, Documentary: 5 };
  const { placements, signLabels } = buildStoreShelves(library(counts));

  // Signs hang at fixed spots; every non-empty one must correspond to a real genre.
  assert.equal(signLabels.length, GENRE_SIGN_SPOTS.length);
  const named = signLabels.filter(Boolean);
  assert.deepEqual([...named].sort(), ['Comedy', 'Drama', 'Horror', 'Western']);

  // Each signed run sits at a known x: left wall, left island, right island, right wall — in the
  // same order as GENRE_SIGN_SPOTS. Back-wall cases (z ≈ -11.59) are unsigned, so skip them.
  const RUN_X = [-8.288, -3.35, 3.35, 8.288];
  const genresUnderSign = RUN_X.map(() => new Set());
  for (const p of placements) {
    if (p.position[2] < -11.4) continue;
    let nearest = 0;
    for (let i = 1; i < RUN_X.length; i++) {
      if (Math.abs(p.position[0] - RUN_X[i]) < Math.abs(p.position[0] - RUN_X[nearest])) nearest = i;
    }
    genresUnderSign[nearest].add(p.movie.genreBucket);
  }

  genresUnderSign.forEach((genres, signIndex) => {
    assert.equal(genres.size, 1, `shelf under sign ${signIndex} mixes genres: ${[...genres].join(', ')}`);
    assert.equal(
      [...genres][0],
      signLabels[signIndex],
      `sign ${signIndex} reads "${signLabels[signIndex]}" over a shelf of ${[...genres][0]}`
    );
  });
});

test('the biggest genres get the biggest shelves, so fewer films are left unshelved', () => {
  // Islands hold 530 each, wall units 280. Give the top genre more than a wall unit can take:
  // if it were assigned a wall unit, films would be dropped.
  const { placements } = buildStoreShelves(library({ Drama: 400, Comedy: 10, Horror: 10, Western: 10 }));
  const shelved = placements.filter((p) => p.movie.genreBucket === 'Drama').length;
  assert.equal(shelved, 400, 'the largest genre should fit on an island, not be truncated');
});

test('genres without a sign of their own go to the back wall rather than vanishing', () => {
  const counts = { Drama: 5, Comedy: 5, Horror: 5, Western: 5, Documentary: 7, Animation: 3 };
  const { placements } = buildStoreShelves(library(counts));

  const shelvedIds = new Set(placements.map((p) => p.movie.id));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(shelvedIds.size, total, 'every film should be somewhere, signed shelf or back wall');

  // Back-wall cases sit at z ≈ -11.59; the deepest wall-unit case only reaches z ≈ -11.09.
  const backGenres = new Set(
    placements.filter((p) => p.position[2] < -11.4).map((p) => p.movie.genreBucket)
  );
  // Documentary (7) is the biggest genre so it earns a sign; Western and Animation rank 5th and
  // 6th with only four signed shelves to go round, so they're the ones stocked at the back.
  assert.deepEqual([...backGenres].sort(), ['Animation', 'Western']);
});

test('an empty library produces no cases and no signs', () => {
  const { placements, signLabels } = buildStoreShelves([]);
  assert.deepEqual(placements, []);
  assert.deepEqual(signLabels.filter(Boolean), []);
});
