<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Astrology App</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
</head>
<body class="bg-gray-900 p-6">
  <div class="max-w-md mx-auto">
    <h1 class="text-white text-2xl font-bold mb-4">Astrology Data</h1>
    <div id="primary-subject-fields" class="mb-4">
      <input id="name" placeholder="Name" class="form-input w-full mb-2" />
      <input id="year" placeholder="Year" class="form-input w-full mb-2" />
      <input id="month" placeholder="Month" class="form-input w-full mb-2" />
      <input id="day" placeholder="Day" class="form-input w-full mb-2" />
      <input id="hour" placeholder="Hour" class="form-input w-full mb-2" />
      <input id="minute" placeholder="Minute" class="form-input w-full mb-2" />
      <input id="city" placeholder="City" class="form-input w-full mb-2" />
      <input id="timezone" placeholder="Time Zone (e.g. America/New_York)" class="form-input w-full mb-2" />
    </div>

    <label class="inline-flex items-center mt-2">
      <input type="checkbox" id="synastry-toggle" class="form-checkbox h-4 w-4 text-indigo-600" />
      <span class="ml-2 text-white">Include Synastry Analysis</span>
    </label>

    <div id="second-subject-fields" class="mt-4 hidden">
      <h3 class="text-white font-semibold mb-2">Second Subject</h3>
      <input id="second_name" placeholder="Name" class="form-input w-full mb-2" />
      <input id="second_year" placeholder="Year" class="form-input w-full mb-2" />
      <input id="second_month" placeholder="Month" class="form-input w-full mb-2" />
      <input id="second_day" placeholder="Day" class="form-input w-full mb-2" />
      <input id="second_hour" placeholder="Hour" class="form-input w-full mb-2" />
      <input id="second_minute" placeholder="Minute" class="form-input w-full mb-2" />
      <input id="second_city" placeholder="City" class="form-input w-full mb-2" />
      <input id="second_timezone" placeholder="Time Zone (e.g. America/New_York)" class="form-input w-full mb-2" />
    </div>

    <button id="submit-btn" class="mt-4 bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">
      Submit
    </button>

    <pre id="result" class="text-white mt-4 whitespace-pre-wrap"></pre>
  </div>

  <script>
    const synastryToggle = document.getElementById('synastry-toggle');
    const secondSubjectFields = document.getElementById('second-subject-fields');
    synastryToggle.addEventListener('change', () => {
      secondSubjectFields.classList.toggle('hidden', !synastryToggle.checked);
    });

    function getSubjectData(prefix) {
      return {
        name: document.getElementById(prefix + 'name').value,
        year: document.getElementById(prefix + 'year').value,
        month: document.getElementById(prefix + 'month').value,
        day: document.getElementById(prefix + 'day').value,
        hour: document.getElementById(prefix + 'hour').value,
        minute: document.getElementById(prefix + 'minute').value,
        city: document.getElementById(prefix + 'city').value,
        timezone: document.getElementById(prefix + 'timezone').value
      };
    }

    const buildRequestBody = () => {
      const subject = getSubjectData('');
      if (synastryToggle.checked) {
        const second_subject = getSubjectData('second_');
        return { first_subject: subject, second_subject };
      }
      return { subject };
    };

    document.getElementById('submit-btn').addEventListener('click', async () => {
      const resultEl = document.getElementById('result');
      resultEl.textContent = 'Loading...';

      try {
        const response = await fetch('/.netlify/functions/astrology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRequestBody())
        });

        const data = await response.json();

        if (!response.ok) {
          resultEl.textContent = `Error: ${data.error || 'Unknown error'}`;
          return;
        }

        resultEl.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        resultEl.textContent = 'Fetch error: ' + err.message;
      }
    });
  </script>
</body>
</html>
