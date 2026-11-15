const test = require('node:test');
const assert = require('node:assert/strict');
const Wax = require('./wax.js');

const dry = { snowType: 'alt', precip: 'keiner' };

test('Schneetemperatur ordnet die richtige Farbe zu', () => {
  const c = (t) => Wax.recommend({ ...dry, snowTemp: t, snowType: 'alt' }).color;
  assert.equal(c(-2.5), 'rot');
  assert.equal(c(-5), 'rot');
  assert.equal(c(-6), 'violett');
  assert.equal(c(-10), 'violett');
  assert.equal(c(-11), 'blau');
  assert.equal(c(-20), 'blau');
  assert.equal(c(-21), 'gruen');
});

test('Lufttemperatur plus Himmel ergibt die geschätzte Schneetemperatur', () => {
  assert.equal(Wax.estimateSnowTemp(-6, 'sonnig'), -6);
  assert.equal(Wax.estimateSnowTemp(-6, 'bewoelkt'), -7);
  assert.equal(Wax.estimateSnowTemp(-6, 'klar'), -9);

  const r = Wax.recommend({ ...dry, airTemp: -6, sky: 'klar' });
  assert.equal(r.snowTemp, -9);
  assert.equal(r.color, 'violett');
  assert.ok(r.notes.some((n) => n.includes('geschätzt')));
});

test('Eine echte Schneetemperatur hat Vorrang vor der Schätzung', () => {
  const r = Wax.recommend({ snowType: 'neu', precip: 'keiner', airTemp: -2, sky: 'sonnig', snowTemp: -12 });
  assert.equal(r.snowTemp, -12);
  assert.equal(r.color, 'blau');
});

test('Regen macht den Schnee nass, Wachs eine Stufe wärmer, Fluor', () => {
  const r = Wax.recommend({ snowType: 'alt', precip: 'regen', snowTemp: -8 });
  assert.equal(r.color, 'rot');
  assert.equal(r.wet, true);
  assert.match(r.fluor, /Fluor empfohlen/);
  assert.equal(r.finishKey, 'grob');
  assert.deepEqual(r.vola, ['Vola HMach Red']);
});

test('Schnee nahe Null gilt als nass', () => {
  const r = Wax.recommend({ snowType: 'alt', precip: 'keiner', snowTemp: -0.5 });
  assert.equal(r.wet, true);
  assert.equal(r.color, 'gelb');
});

test('Trockene Kälte: fluorfrei und feine Struktur bei Neuschnee', () => {
  const r = Wax.recommend({ snowType: 'neu', precip: 'keiner', snowTemp: -15 });
  assert.equal(r.color, 'blau');
  assert.equal(r.wet, false);
  assert.match(r.fluor, /Fluorfrei/);
  assert.equal(r.finishKey, 'fein');
});

test('Kunstschnee bekommt mittlere Struktur und einen Hinweis zum Wachs', () => {
  const r = Wax.recommend({ snowType: 'kunst', precip: 'keiner', snowTemp: -8 });
  assert.equal(r.finishKey, 'mittel');
  assert.ok(r.notes.some((n) => n.includes('Kunstschnee')));
});

test('Vola-Produkte kommen aus der Stufe, Grün hat keine Empfehlung', () => {
  assert.deepEqual(Wax.recommend({ ...dry, snowTemp: -8 }).vola, ['Vola MX Purple', 'Vola Race Violet (flüssig)']);
  const g = Wax.recommend({ ...dry, snowTemp: -25 });
  assert.equal(g.color, 'gruen');
  assert.deepEqual(g.vola, []);
  assert.ok(g.notes.some((n) => n.includes('kein Vola-Produkt')));
});

test('Ungültige Eingaben werfen einen Fehler', () => {
  assert.throws(() => Wax.recommend({ snowType: 'nebel', precip: 'keiner', snowTemp: -5 }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'hagel', snowTemp: -5 }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'keiner', airTemp: 'kalt', sky: 'sonnig' }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'keiner', airTemp: -5, sky: 'nebel' }));
  assert.throws(() => Wax.recommend({ snowType: 'alt', precip: 'keiner', snowTemp: 25 }));
});
