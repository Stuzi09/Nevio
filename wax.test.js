const test = require('node:test');
const assert = require('node:assert/strict');
const Wax = require('./wax.js');

test('Schneetemperatur ordnet die richtige Farbe zu', () => {
  assert.equal(Wax.recommend({ snowTemp: 3 }).color, 'gelb');
  assert.equal(Wax.recommend({ snowTemp: -2 }).color, 'gelb');
  assert.equal(Wax.recommend({ snowTemp: -2.5 }).color, 'rot');
  assert.equal(Wax.recommend({ snowTemp: -5 }).color, 'rot');
  assert.equal(Wax.recommend({ snowTemp: -6 }).color, 'violett');
  assert.equal(Wax.recommend({ snowTemp: -10 }).color, 'violett');
  assert.equal(Wax.recommend({ snowTemp: -11 }).color, 'blau');
  assert.equal(Wax.recommend({ snowTemp: -20 }).color, 'blau');
  assert.equal(Wax.recommend({ snowTemp: -21 }).color, 'gruen');
  assert.equal(Wax.recommend({ snowTemp: -35 }).color, 'gruen');
});

test('Wetter-Modus schätzt die Schneetemperatur aus Luft und Himmel', () => {
  assert.equal(Wax.estimateSnowTemp(-6, 'sonnig'), -6);
  assert.equal(Wax.estimateSnowTemp(-6, 'bewoelkt'), -7);
  assert.equal(Wax.estimateSnowTemp(-6, 'klar'), -9);

  // Lufttemperatur -6, klarer Himmel -> Schnee -9 -> violett
  const r = Wax.recommend({ airTemp: -6, sky: 'klar' });
  assert.equal(r.color, 'violett');
  assert.equal(r.snowTemp, -9);
});

test('Nassschnee wird eine Stufe wärmer gewählt und bekommt Fluor', () => {
  const r = Wax.recommend({ snowTemp: -8, wet: true });
  assert.equal(r.color, 'rot');
  assert.equal(r.wet, true);
  assert.match(r.fluor, /Fluor empfohlen/);
});

test('Nass wird bei der wärmsten Stufe nicht weiter verschoben', () => {
  const r = Wax.recommend({ snowTemp: 1, wet: true });
  assert.equal(r.color, 'gelb');
});

test('Hohe Luftfeuchte nahe Null setzt Nassschnee automatisch', () => {
  const r = Wax.recommend({ airTemp: -1, sky: 'bewoelkt', humidity: 95 });
  assert.equal(r.wet, true);
  // Schnee -2 -> gelb (Stufe 0), nass bleibt bei gelb
  assert.equal(r.color, 'gelb');
});

test('Trockene Kälte bleibt ohne Nass-Verschiebung und ohne Fluor-Pflicht', () => {
  const r = Wax.recommend({ airTemp: -15, sky: 'sonnig', humidity: 60 });
  assert.equal(r.wet, false);
  assert.equal(r.color, 'blau');
  assert.match(r.fluor, /Fluorfrei/);
});

test('Ungültige Eingaben werfen einen Fehler', () => {
  assert.throws(() => Wax.recommend({ airTemp: 'kalt', sky: 'sonnig' }));
  assert.throws(() => Wax.recommend({ airTemp: -5, sky: 'nebel' }));
  assert.throws(() => Wax.recommend({ snowTemp: 25 }));
  assert.throws(() => Wax.recommend({ snowTemp: -60 }));
});
