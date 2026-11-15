(function () {
  const form = document.getElementById('form');
  const snowFields = document.getElementById('snow-fields');
  const weatherFields = document.getElementById('weather-fields');
  const errorEl = document.getElementById('error');
  const result = document.getElementById('result');

  const COLORS = {
    gelb: '#f5c400',
    rot: '#d6322b',
    violett: '#7a3fb0',
    blau: '#1f6fd1',
    gruen: '#2e9e4f',
  };

  function currentMode() {
    return form.querySelector('input[name="mode"]:checked').value;
  }

  function readNumber(id) {
    const raw = document.getElementById(id).value.trim();
    if (raw === '') return undefined;
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    result.hidden = true;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function render(r) {
    document.getElementById('swatch').style.background = COLORS[r.color];
    document.getElementById('resultName').textContent = 'Wachs: ' + r.name;
    document.getElementById('resultDesc').textContent = r.description;
    document.getElementById('resultFluor').textContent = r.fluor;

    const notes = document.getElementById('resultNotes');
    notes.replaceChildren();
    r.notes.forEach(function (text) {
      const li = document.createElement('li');
      li.textContent = text;
      notes.appendChild(li);
    });

    result.hidden = false;
  }

  function syncMode() {
    const weather = currentMode() === 'weather';
    snowFields.hidden = weather;
    weatherFields.hidden = !weather;
    result.hidden = true;
    clearError();
  }

  form.addEventListener('change', function (e) {
    if (e.target.name === 'mode') syncMode();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    const wet = document.getElementById('wet').checked;
    let input;

    if (currentMode() === 'snow') {
      const snowTemp = readNumber('snowTemp');
      if (snowTemp === undefined) return showError('Bitte die Schneetemperatur eingeben.');
      if (Number.isNaN(snowTemp)) return showError('Die Schneetemperatur ist keine gültige Zahl.');
      input = { snowTemp: snowTemp, wet: wet };
    } else {
      const airTemp = readNumber('airTemp');
      if (airTemp === undefined) return showError('Bitte die Lufttemperatur eingeben.');
      if (Number.isNaN(airTemp)) return showError('Die Lufttemperatur ist keine gültige Zahl.');
      const humidity = readNumber('humidity');
      if (Number.isNaN(humidity)) return showError('Die Luftfeuchte ist keine gültige Zahl.');
      if (humidity !== undefined && (humidity < 0 || humidity > 100)) {
        return showError('Die Luftfeuchte muss zwischen 0 und 100 % liegen.');
      }
      input = {
        airTemp: airTemp,
        sky: document.getElementById('sky').value,
        humidity: humidity,
        wet: wet,
      };
    }

    try {
      render(Wax.recommend(input));
    } catch (err) {
      showError(err.message);
    }
  });

  syncMode();
})();
