const test = require('node:test');
const assert = require('node:assert/strict');
const Wax = require('./wax.js');

const rec = (snowTemp, extra = {}) =>
  Wax.recommend({ snowType: 'neu', precip: 'keiner', snowTemp, ...extra });

test('Stufen nach Vola-Tabelle: Blau -25..-10, Violett -12..-4, Rot -5..0, Gelb -2..10', () => {
  assert.equal(rec(-25).color, 'blau');
  assert.equal(rec(-10).color, 'blau');
  assert.equal(rec(-15).color, 'blau');
  assert.equal(rec(-8).color, 'violett');
  assert.equal(rec(-4).color, 'violett');
  assert.equal(rec(-3).color, 'rot');
  assert.equal(rec(-1.5).color, 'rot');
  assert.equal(rec(0).color, 'gelb'); // ab -1 °C gilt der Schnee als nass
  assert.equal(rec(3).color, 'gelb');
  assert.equal(rec(10).color, 'gelb');
});

test('Überlappung: trocken nimmt die kältere, nass die wärmere Stufe', () => {
  // -11 liegt in Blau und Violett
  assert.equal(Wax.pickClass(-11, false).id, 'blau');
  assert.equal(Wax.pickClass(-11, true).id, 'violett');
  // -4 liegt in Violett und Rot
  assert.equal(Wax.pickClass(-4, false).id, 'violett');
  assert.equal(Wax.pickClass(-4, true).id, 'rot');
});

test('Ausserhalb der Tabelle: nächste Stufe und Hinweis', () => {
  const r = rec(-30);
  assert.equal(r.color, 'blau');
  assert.ok(r.notes.some((n) => n.includes('ausserhalb der Vola-Tabelle')));
});

test('Lufttemperatur plus Himmel ergibt die geschätzte Schneetemperatur', () => {
  assert.equal(Wax.estimateSnowTemp(-6, 'sonnig'), -6);
  assert.equal(Wax.estimateSnowTemp(-6, 'bewoelkt'), -7);
  assert.equal(Wax.estimateSnowTemp(-6, 'klar'), -9);
  const r = Wax.recommend({ snowType: 'neu', precip: 'keiner', airTemp: -6, sky: 'klar' });
  assert.equal(r.snowTemp, -9);
  assert.ok(r.notes.some((n) => n.includes('geschätzt')));
});

test('Echte Schneetemperatur hat Vorrang vor der Schätzung', () => {
  const r = Wax.recommend({ snowType: 'neu', precip: 'keiner', airTemp: -2, sky: 'sonnig', snowTemp: -12 });
  assert.equal(r.snowTemp, -12);
});

test('Nass: HMrace statt LMrace', () => {
  const dry = rec(-8);
  const wet = rec(-8, { precip: 'regen' });
  assert.ok(dry.products.includes('LMrace Purple'));
  assert.ok(wet.products.includes('HMrace Purple'));
  assert.equal(wet.wet, true);
});

test('Altschnee und Kunstschnee bekommen Moly', () => {
  const r = Wax.recommend({ snowType: 'kunst', precip: 'keiner', snowTemp: -8 });
  assert.equal(r.moly, true);
  assert.ok(r.products.includes('LMrace Purple Moly'));
  assert.ok(r.products.includes('Race Propulsor Blue Moly'));
  assert.ok(!Wax.recommend({ snowType: 'neu', precip: 'keiner', snowTemp: -15 }).moly);
});

test('Propulsor nur im Katalog-Bereich', () => {
  assert.ok(rec(-8).products.includes('Race Propulsor Blue'));
  assert.ok(rec(-2).products.includes('Race Propulsor Yellow'));
  assert.ok(!rec(-15).products.some((p) => p.includes('Propulsor')));
  assert.ok(!rec(3).products.some((p) => p.includes('Propulsor')));
});

test('Finish nach Katalog', () => {
  assert.match(rec(-8, { snowType: 'alt' }).finish, /Fine Steel/);
  assert.match(rec(-8, { snowType: 'neu' }).finish, /Fleece/);
});

test('Mischung: Graphit bei Kunst- oder Frühlingsschnee, nie bei Neuschnee', () => {
  assert.equal(Wax.recommend({ snowType: 'kunst', precip: 'keiner', snowTemp: -8 }).compose.needed, true);
  assert.equal(Wax.recommend({ snowType: 'alt', precip: 'keiner', snowTemp: 0 }).compose.needed, true);
  assert.equal(rec(-8, { snowType: 'neu' }).compose.needed, false);
  assert.equal(rec(-8, { snowType: 'neu', precip: 'schnee' }).compose.needed, false);
});

test('Ungültige Eingaben werfen einen Fehler', () => {
  assert.throws(() => Wax.recommend({ snowType: 'nebel', precip: 'keiner', snowTemp: -5 }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'hagel', snowTemp: -5 }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'keiner', airTemp: 'kalt', sky: 'sonnig' }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'keiner', airTemp: -5, sky: 'nebel' }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'keiner', snowTemp: 25 }));
});
