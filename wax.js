// Wachs-Logik: Schneetemperatur (oder Wetter) rein, Wachsfarbe raus.
// Die Temperaturgrenzen sind Richtwerte in Anlehnung an gängige Wachstabellen.
// Vor dem Kauf lohnt sich ein Blick in die Tabelle des Herstellers.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Wax = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Von warm nach kalt. min ist die untere Grenze der Schneetemperatur in °C.
  const CLASSES = [
    { id: 'gelb', name: 'Gelb', min: -2, text: 'Nasser, warmer Schnee um den Gefrierpunkt.' },
    { id: 'rot', name: 'Rot', min: -5, text: 'Leicht frostiger Schnee, typisch für Frühling und Tauwetter.' },
    { id: 'violett', name: 'Violett', min: -10, text: 'Mittelkalter Schnee, die Standardstufe für viele Tage im Winter.' },
    { id: 'blau', name: 'Blau', min: -20, text: 'Kalter, trockener Schnee.' },
    { id: 'gruen', name: 'Grün', min: -Infinity, text: 'Sehr kalter Schnee, meist unter -20 °C.' },
  ];

  // Wie stark die Himmelslage die Schneetemperatur gegenüber der Lufttemperatur verschiebt.
  // Klarer Himmel kühlt die Schneeoberfläche nachts stärker aus.
  const SKY_OFFSET = {
    sonnig: 0,
    bewoelkt: -1,
    klar: -3,
  };

  const SKY_LABEL = {
    sonnig: 'sonnig',
    bewoelkt: 'bewölkt',
    klar: 'klarer Himmel / Nacht',
  };

  function classIndexFor(snowTemp) {
    for (let i = 0; i < CLASSES.length; i++) {
      if (snowTemp >= CLASSES[i].min) return i;
    }
    return CLASSES.length - 1;
  }

  function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  // Schätzt die Schneetemperatur aus Lufttemperatur und Himmel.
  function estimateSnowTemp(airTemp, sky) {
    if (!isNumber(airTemp)) throw new Error('Lufttemperatur fehlt oder ist keine Zahl.');
    if (!(sky in SKY_OFFSET)) throw new Error('Unbekannte Himmelslage: ' + sky);
    return airTemp + SKY_OFFSET[sky];
  }

  // Hauptfunktion. Entweder snowTemp direkt angeben oder airTemp + sky (Wetter-Modus).
  // Optional: wet (Nassschnee, manuell), humidity (Luftfeuchte in %).
  function recommend(input) {
    const wetManual = input.wet === true;
    let snowTemp;
    let source;
    let autoWet = false;

    if (isNumber(input.snowTemp)) {
      snowTemp = input.snowTemp;
      source = 'snow';
    } else {
      snowTemp = estimateSnowTemp(input.airTemp, input.sky);
      source = 'weather';
      if (isNumber(input.humidity) && input.humidity >= 90 && input.airTemp >= -3) {
        autoWet = true;
      }
    }

    if (snowTemp > 10 || snowTemp < -40) {
      throw new Error('Schneetemperatur ausserhalb des plausiblen Bereichs (-40 bis +10 °C).');
    }

    const wet = wetManual || autoWet;
    let index = classIndexFor(snowTemp);

    // Bei nassem Schnee ein Wachs eine Stufe wärmer nehmen, es bleibt weicher und gleitet besser.
    let shifted = false;
    if (wet && index > 0) {
      index -= 1;
      shifted = true;
    }

    const wax = CLASSES[index];
    const fluor = wet ? 'Fluor empfohlen (nasser Schnee).' : 'Fluorfrei (Kohlenwasserstoff) reicht.';

    const notes = [];
    if (shifted) notes.push('Nassschnee: Wachs eine Stufe wärmer gewählt.');
    if (autoWet) notes.push('Hohe Luftfeuchte und Temperatur nahe Null deuten auf nassen Schnee hin.');
    if (source === 'weather') {
      notes.push('Schneetemperatur geschätzt: ' + snowTemp + ' °C (' + SKY_LABEL[input.sky] + ').');
    }

    return {
      color: wax.id,
      name: wax.name,
      description: wax.text,
      snowTemp: snowTemp,
      fluor: fluor,
      wet: wet,
      notes: notes,
    };
  }

  return {
    CLASSES: CLASSES,
    SKY_OFFSET: SKY_OFFSET,
    SKY_LABEL: SKY_LABEL,
    classIndexFor: classIndexFor,
    estimateSnowTemp: estimateSnowTemp,
    recommend: recommend,
  };
});
