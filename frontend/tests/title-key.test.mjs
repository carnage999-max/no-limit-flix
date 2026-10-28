import test from 'node:test';
import assert from 'node:assert/strict';

const { titleKey, releaseYearOf, buildTitleIndex, isKnownFilm } = await import('../src/lib/title-key.ts');
const { mapWithConcurrency } = await import('../src/lib/concurrency.ts');

test('titleKey ignores case, punctuation, articles, years and file noise', () => {
  assert.equal(titleKey('The Last Man on Earth (1964)'), 'last man on earth');
  assert.equal(titleKey('last_man-on EARTH 1964'), 'last man on earth');
  assert.equal(titleKey('A Bucket of Blood - Full Movie HD.mp4'), 'bucket of blood');
  assert.equal(titleKey('Amélie & Co'), 'amelie and co');
  assert.equal(titleKey('2001: A Space Odyssey'), '2001 a space odyssey');
  assert.equal(titleKey('   '), '');
});

test('releaseYearOf reads the year field, then the title', () => {
  assert.equal(releaseYearOf('1964', 'x'), 1964);
  assert.equal(releaseYearOf(undefined, 'Night of the Living Dead (1968)'), 1968);
  assert.equal(releaseYearOf('n/a', 'Plain title'), null);
});

test('isKnownFilm matches same title, but lets a remake in a different year through', () => {
  const index = buildTitleIndex([
    { title: 'Nosferatu', releaseYear: 1922 },
    { title: 'The Brain That Wouldn\'t Die', releaseYear: null },
  ]);

  assert.equal(isKnownFilm(index, 'NOSFERATU (1922)', 1922), true);
  assert.equal(isKnownFilm(index, 'Nosferatu', 1923), true);
  assert.equal(isKnownFilm(index, 'Nosferatu', 1979), false);
  assert.equal(isKnownFilm(index, 'Nosferatu', null), true);
  assert.equal(isKnownFilm(index, 'Brain That Wouldnt Die', 1962), true);
  assert.equal(isKnownFilm(index, 'Something Else', 1962), false);
});

test('mapWithConcurrency keeps order and never exceeds the limit', async () => {
  let active = 0;
  let peak = 0;
  const result = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return n * 10;
  });

  assert.deepEqual(result, [10, 20, 30, 40, 50, 60]);
  assert.equal(peak, 2);
});
