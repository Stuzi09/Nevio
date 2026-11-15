// Wachs-Logik nach dem Vola-Katalog 2025-26.
// Temperaturbereiche (Luft) und Produktnamen stammen aus dem Katalog.
// Wo sich Bereiche überlappen, entscheidet nass oder trocken.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Wax = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Stufen mit Luft-Temperatur in °C (von/bis, inklusive). Gleiche Reihenfolge wie im Katalog.
  const CLASSES = [
    {
      id: 'blau', name: 'Blau', min: -25, max: -10,
      text: 'Kalter, trockener Schnee. Race-Blau ist fluorfrei und für wenig abrasiven Schnee.',
      mx: 'MX-E Blau', race: 'Blue', moly: true,
    },
    {
      id: 'violett', name: 'Violett', min: -12, max: -4,
      text: 'Mittelkalter Schnee, die Standardstufe für viele Tage im Winter.',
      mx: 'MX-E Violett', race: 'Purple', moly: true,
    },
    {
      id: 'rot', name: 'Rot', min: -5, max: 0,
      text: 'Leicht frostiger Schnee, typisch für Frühling und Tauwetter.',
      mx: 'MX-E Rot', race: 'Red', moly: true,
    },
    {
      id: 'gelb', name: 'Gelb', min: -2, max: 10,
      text: 'Nasser, warmer Schnee um den Gefrierpunkt.',
      mx: 'MX-E Gelb', race: 'Yellow', moly: true,
    },
  ];

  // Race Propulsor: eigene Temperaturen laut Katalog.
  const PROPULSOR = {
    blau: { min: -12, max: -5, name: 'Race Propulsor Blue', moly: 'Race Propulsor Blue Moly' },
    gelb: { min: -5, max: 0, name: 'Race Propulsor Yellow', moly: 'Race Propulsor Yellow Moly' },
  };

  const SKY_OFFSET = { sonnig: 0, bewoelkt: -1, klar: -3 };
  const SKY_LABEL = { sonnig: 'sonnig', bewoelkt: 'bewölkt', klar: 'klarer Himmel / Nacht' };
  const SNOW_TYPES = ['kunst', 'alt', 'neu'];
  const SNOW_LABEL = { kunst: 'Kunstschnee', alt: 'Altschnee', neu: 'Neuschnee' };
  const PRECIP = ['keiner', 'schnee', 'regen'];
  const PRECIP_LABEL = { keiner: 'kein Niederschlag', schnee: 'Schneefall', regen: 'Regen' };

  function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function estimateSnowTemp(airTemp, sky) {
    if (!isNumber(airTemp)) throw new Error('Lufttemperatur fehlt oder ist keine Zahl.');
    if (!(sky in SKY_OFFSET)) throw new Error('Unbekannte Himmelslage: ' + sky);
    return airTemp + SKY_OFFSET[sky];
  }

  // Alle Stufen, deren Bereich die Temperatur enthält.
  function matchingClasses(temp) {
    return CLASSES.filter((c) => temp >= c.min && temp <= c.max);
  }

  // Wählt bei Überlappung: nass wärmer, trocken kälter.
  function pickClass(temp, wet) {
    const hits = matchingClasses(temp);
    if (hits.length === 0) return null;
    if (hits.length === 1) return hits[0];
    return wet ? hits[hits.length - 1] : hits[0];
  }

  // Belagsstruktur und Finish laut Katalog.
  function pickFinish(snowType, wet, moly) {
    if (moly) {
      return 'Fine Steel (Feinstahl) nach dem Schaben, dann Nylon. Moly-Wachs braucht die feine Stahlbürste.';
    }
    if (snowType === 'neu' && !wet) {
      return 'Fleece, dann Nylon. Das bringt die Gleitung auf den ersten Kilometern.';
    }
    return 'Fine Steel, dann Nylon. Das hält die Gleitung länger.';
  }

  // Graphit ist für abrasive Schnee (Kunst, Gletscher, Frühling). Auf frischem oder fallendem Schnee nicht verwenden.
  function pickCompose(snowType, precip, temp) {
    if (precip === 'schnee' || snowType === 'neu') {
      return { needed: false, text: 'Keine Mischung nötig. Graphit nicht auf frischem oder fallendem Schnee.' };
    }
    if (snowType === 'kunst' || (snowType === 'alt' && temp >= -5)) {
      return {
        needed: true,
        text: 'Graphit-Mischung möglich: Graphite wird laut Katalog meist mit einer Base gemischt. Bei sehr abrasivem Schnee (Kunst, Gletscher, Frühling).',
      };
    }
    return { needed: false, text: 'Keine Mischung nötig. Das fertige Wachs reicht.' };
  }

  // input: { snowTemp? , airTemp?, sky?, snowType, precip }
  function recommend(input) {
    const snowType = input.snowType;
    if (!SNOW_TYPES.includes(snowType)) throw new Error('Unbekannter Schneetyp: ' + snowType);
    const precip = input.precip || 'keiner';
    if (!PRECIP.includes(precip)) throw new Error('Unbekannter Niederschlag: ' + precip);

    let temp;
    let estimated = false;
    if (isNumber(input.snowTemp)) {
      temp = input.snowTemp;
    } else {
      temp = estimateSnowTemp(input.airTemp, input.sky);
      estimated = true;
    }

    if (temp > 10 || temp < -40) {
      throw new Error('Temperatur ausserhalb des plausiblen Bereichs (-40 bis +10 °C).');
    }

    const wet = precip === 'regen' || temp >= -1;
    const notes = [];
    if (estimated) {
      notes.push('Schneetemperatur geschätzt: ' + temp + ' °C (' + SKY_LABEL[input.sky] + ').');
    }

    let wax = pickClass(temp, wet);
    if (!wax) {
      // Ausserhalb des Katalogs: nächste Stufe nehmen und warnen.
      wax = temp < CLASSES[0].min ? CLASSES[0] : CLASSES[CLASSES.length - 1];
      notes.push('Temperatur liegt ausserhalb der Vola-Tabelle. Nächste Stufe gewählt, beim Hersteller nachfragen.');
    }

    // Moly laut Katalog für alten, dreckigen und künstlichen Schnee.
    const moly = snowType === 'kunst' || snowType === 'alt';
    const race = wet ? 'HMrace ' + wax.race : 'LMrace ' + wax.race;
    const raceName = moly ? race + ' Moly' : race;

    const products = [wax.mx, raceName];
    Object.values(PROPULSOR).forEach(function (p) {
      if (temp >= p.min && temp <= p.max) products.push(moly ? p.moly : p.name);
    });

    if (wet && wax.id !== 'gelb') {
      notes.push('Nass: HMrace ist für hohe Luftfeuchte (70 bis 100 %) gedacht.');
    }
    if (moly) {
      notes.push('Moly für alten, dreckigen oder künstlichen Schnee laut Katalog.');
    }

    const compose = pickCompose(snowType, precip, temp);

    return {
      color: wax.id,
      name: wax.name,
      description: wax.text,
      snowTemp: temp,
      snowType: snowType,
      snowTypeLabel: SNOW_LABEL[snowType],
      precip: precip,
      precipLabel: PRECIP_LABEL[precip],
      products: products,
      fluor: 'Kein Fluor nötig. Die Vola-Produkte hier sind fluorfrei.',
      finish: pickFinish(snowType, wet, moly),
      moly: moly,
      wet: wet,
      compose: compose,
      notes: notes,
    };
  }

  return {
    CLASSES: CLASSES,
    PROPULSOR: PROPULSOR,
    SKY_OFFSET: SKY_OFFSET,
    SKY_LABEL: SKY_LABEL,
    SNOW_TYPES: SNOW_TYPES,
    SNOW_LABEL: SNOW_LABEL,
    PRECIP: PRECIP,
    PRECIP_LABEL: PRECIP_LABEL,
    matchingClasses: matchingClasses,
    pickClass: pickClass,
    estimateSnowTemp: estimateSnowTemp,
    recommend: recommend,
  };
});
