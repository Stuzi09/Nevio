// Wachs-Logik: Wetter und Schneeverhältnisse rein, Wachs, Fluor und Belagsstruktur raus.
// Temperaturgrenzen und Struktur sind Richtwerte. Die Produktzuordnung zu Vola beruht
// auf Händler- und Distributorangaben, die sich teils widersprechen. Vor dem Kauf prüfen.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Wax = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Von warm nach kalt. min ist die untere Grenze der Schneetemperatur in °C.
  const CLASSES = [
    {
      id: 'gelb', name: 'Gelb', min: -2,
      text: 'Nasser, warmer Schnee um den Gefrierpunkt.',
      vola: ['Vola MX Yellow'],
    },
    {
      id: 'rot', name: 'Rot', min: -5,
      text: 'Leicht frostiger Schnee, typisch für Frühling und Tauwetter.',
      vola: ['Vola MX Red'],
      volaWet: ['Vola HMach Red'],
    },
    {
      id: 'violett', name: 'Violett', min: -10,
      text: 'Mittelkalter Schnee, die Standardstufe für viele Tage im Winter.',
      vola: ['Vola MX Purple', 'Vola Race Violet (flüssig)'],
    },
    {
      id: 'blau', name: 'Blau', min: -20,
      text: 'Kalter, trockener Schnee.',
      vola: ['Vola MX Blue', 'Vola LMach Blue (fluorfrei)'],
    },
    {
      id: 'gruen', name: 'Grün', min: -Infinity,
      text: 'Sehr kalter Schnee, meist unter -20 °C.',
      vola: [],
    },
  ];

  // Wie stark die Himmelslage die Schneetemperatur gegenüber der Lufttemperatur verschiebt.
  const SKY_OFFSET = { sonnig: 0, bewoelkt: -1, klar: -3 };
  const SKY_LABEL = { sonnig: 'sonnig', bewoelkt: 'bewölkt', klar: 'klarer Himmel / Nacht' };

  const SNOW_TYPES = ['kunst', 'alt', 'neu'];
  const SNOW_LABEL = { kunst: 'Kunstschnee', alt: 'Altschnee', neu: 'Neuschnee' };

  const PRECIP = ['keiner', 'schnee', 'regen'];
  const PRECIP_LABEL = { keiner: 'kein Niederschlag', schnee: 'Schneefall', regen: 'Regen' };

  // Belagsstruktur: fein gleitet auf trockenem, kaltem Schnee, grob leitet Wasser ab.
  const FINISH = {
    fein: 'Feine Struktur (Bürste fein oder Stahlwolle fein)',
    mittel: 'Mittlere Struktur (Bürste mittel)',
    grob: 'Grobe Struktur (Bürste grob oder Kork)',
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

  function estimateSnowTemp(airTemp, sky) {
    if (!isNumber(airTemp)) throw new Error('Lufttemperatur fehlt oder ist keine Zahl.');
    if (!(sky in SKY_OFFSET)) throw new Error('Unbekannte Himmelslage: ' + sky);
    return airTemp + SKY_OFFSET[sky];
  }

  function pickFinish(snowType, wet, snowTemp) {
    if (wet) return 'grob';
    if (snowType === 'neu') return 'fein';
    if (snowType === 'kunst') return 'mittel';
    // Altschnee: bei Plusnähe etwas gröber, sonst mittel
    return snowTemp >= -5 ? 'grob' : 'mittel';
  }

  // input: { snowTemp? , airTemp?, sky?, snowType, precip }
  // snowTemp hat Vorrang. Ohne snowTemp wird sie aus Luft und Himmel geschätzt.
  function recommend(input) {
    const snowType = input.snowType;
    if (!SNOW_TYPES.includes(snowType)) throw new Error('Unbekannter Schneetyp: ' + snowType);
    const precip = input.precip || 'keiner';
    if (!PRECIP.includes(precip)) throw new Error('Unbekannter Niederschlag: ' + precip);

    let snowTemp;
    let estimated = false;
    if (isNumber(input.snowTemp)) {
      snowTemp = input.snowTemp;
    } else {
      snowTemp = estimateSnowTemp(input.airTemp, input.sky);
      estimated = true;
    }

    if (snowTemp > 10 || snowTemp < -40) {
      throw new Error('Schneetemperatur ausserhalb des plausiblen Bereichs (-40 bis +10 °C).');
    }

    // Nass: Regen oder Schnee nahe Null.
    const wet = precip === 'regen' || snowTemp >= -1;

    let index = classIndexFor(snowTemp);
    let shifted = false;
    if (wet && index > 0) {
      index -= 1;
      shifted = true;
    }

    const wax = CLASSES[index];
    const finish = pickFinish(snowType, wet, snowTemp);

    const notes = [];
    if (estimated) {
      notes.push('Schneetemperatur geschätzt: ' + snowTemp + ' °C (' + SKY_LABEL[input.sky] + ').');
    }
    if (precip === 'regen') notes.push('Regen: der Schnee wird nass, Fluor nehmen.');
    if (shifted) notes.push('Nasser Schnee: ein Wachs wärmer als die Temperatur sagt.');
    if (snowType === 'kunst') notes.push('Kunstschnee ist hart und körnig. Ein hartes Wachs hält länger.');
    if (wax.vola.length === 0) {
      notes.push('Für diesen Bereich nennen die Quellen kein Vola-Produkt. Nimm das Blau und frag beim Händler nach.');
    }

    return {
      color: wax.id,
      name: wax.name,
      description: wax.text,
      snowTemp: snowTemp,
      snowType: snowType,
      snowTypeLabel: SNOW_LABEL[snowType],
      precip: precip,
      precipLabel: PRECIP_LABEL[precip],
      vola: (wet && wax.volaWet ? wax.volaWet : wax.vola).slice(),
      fluor: wet ? 'Fluor empfohlen (nass).' : 'Fluorfrei (Kohlenwasserstoff) reicht.',
      finish: FINISH[finish],
      finishKey: finish,
      wet: wet,
      notes: notes,
    };
  }

  return {
    CLASSES: CLASSES,
    SKY_OFFSET: SKY_OFFSET,
    SKY_LABEL: SKY_LABEL,
    SNOW_TYPES: SNOW_TYPES,
    SNOW_LABEL: SNOW_LABEL,
    PRECIP: PRECIP,
    PRECIP_LABEL: PRECIP_LABEL,
    FINISH: FINISH,
    classIndexFor: classIndexFor,
    estimateSnowTemp: estimateSnowTemp,
    recommend: recommend,
  };
});
