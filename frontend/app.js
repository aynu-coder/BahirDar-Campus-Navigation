const STORAGE_KEY = 'bduNavigatorSelection';

let userLocation = null;

function showStatus(message, isError = false) {
  const status = document.getElementById('locationStatus');
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle('error', isError);
}

function saveSelection(selection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
}

function readSelection() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

async function geocodePlace(placeName) {
  const query = `${placeName}, Bahir Dar, Ethiopia`;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error('Location lookup failed.');
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error('Place not found.');
  }

  const place = data[0];

  return {
    lat: parseFloat(place.lat),
    lon: parseFloat(place.lon),
    label: place.display_name
  };
}

function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => reject(new Error(error.message)),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
}

function initLandingPage() {
  const locateBtn = document.getElementById('locateBtn');
  const routeForm = document.getElementById('routeForm');
  const startInput = document.getElementById('startInput');
  const destinationInput = document.getElementById('destinationInput');
  const heroRouteBtn = document.getElementById('heroRouteBtn');

  if (!locateBtn || !routeForm || !startInput || !destinationInput) {
    return;
  }

  const setStartFromLocation = () => {
    if (userLocation) {
      startInput.value = 'Use my location';
      showStatus('Using your current location as the starting point.');
    }
  };

  locateBtn.addEventListener('click', async () => {
    try {
      userLocation = await requestUserLocation();
      setStartFromLocation();
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  heroRouteBtn?.addEventListener('click', () => {
    document.querySelector('#route-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  routeForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const startValue = startInput.value.trim();
    const destinationValue = destinationInput.value.trim();

    if (!destinationValue) {
      showStatus('Please enter a destination before continuing.', true);
      destinationInput.focus();
      return;
    }

    try {
      let startSelection;

      if (startValue && startValue.toLowerCase() !== 'use my location') {
        startSelection = await geocodePlace(startValue);
      } else if (userLocation) {
        startSelection = {
          lat: userLocation.lat,
          lon: userLocation.lon,
          label: 'Your Location'
        };
      } else {
        throw new Error('Please enter a starting point or use your current location.');
      }

      const destinationSelection = await geocodePlace(destinationValue);

      saveSelection({
        start: startSelection,
        destination: destinationSelection
      });

      window.location.href = 'map.html';
    } catch (error) {
      showStatus(error.message || 'Unable to find a route for that destination.', true);
    }
  });
}

async function drawRouteForSelection(selection) {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    return;
  }

  const map = L.map('map').setView([11.5936, 37.3908], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const start = selection.start;
  const destination = selection.destination;

  const startMarker = L.circleMarker([start.lat, start.lon], {
    radius: 8,
    color: '#1dbf73',
    fillColor: '#1dbf73',
    fillOpacity: 1
  }).addTo(map).bindPopup(`Start: ${start.label}`);

  const destinationMarker = L.circleMarker([destination.lat, destination.lon], {
    radius: 8,
    color: '#ff5d6d',
    fillColor: '#ff5d6d',
    fillOpacity: 1
  }).addTo(map).bindPopup(`Destination: ${destination.label}`);

  const summary = document.getElementById('routeSummary');
  const startLabel = document.getElementById('startLabel');
  const destinationLabel = document.getElementById('destinationLabel');
  const distanceValue = document.getElementById('distanceValue');

  try {
    const routeResponse = await fetch('http://localhost:5000/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start_lat: start.lat,
        start_lon: start.lon,
        goal_lat: destination.lat,
        goal_lon: destination.lon
      })
    });

    const data = await routeResponse.json();

    if (data.status !== 'success') {
      summary.innerHTML = '<strong>No valid route was found.</strong><br>Please return to the search page and choose a different destination.';
      distanceValue.textContent = 'N/A';
      startLabel.textContent = start.label;
      destinationLabel.textContent = destination.label;
      map.setView([start.lat, start.lon], 14);
      startMarker.openPopup();
      destinationMarker.openPopup();
      return;
    }

    const latlngs = data.coordinates.map((point) => [point.lat, point.lon]);
    latlngs.push([destination.lat, destination.lon]);

    const routeLine = L.polyline(latlngs, {
      color: '#0f7ce6',
      weight: 6,
      opacity: 0.9,
      smoothFactor: 1
    }).addTo(map);

    const distance = Number(data.cost_km || 0);

    routeLine.bindPopup(`Route distance: ${distance.toFixed(2)} km`);
    map.fitBounds(routeLine.getBounds(), { padding: [35, 35] });

    startLabel.textContent = start.label;
    destinationLabel.textContent = destination.label;
    distanceValue.textContent = `${distance.toFixed(2)} km`;
    summary.innerHTML = `
      <strong>Start:</strong> ${start.label}<br>
      <strong>Destination:</strong> ${destination.label}
    `;
  } catch (error) {
    summary.innerHTML = '<strong>Route service is unavailable.</strong><br>Please verify the backend is running on localhost:5000 and try again.';
    distanceValue.textContent = 'N/A';
    startLabel.textContent = start.label;
    destinationLabel.textContent = destination.label;
    map.setView([start.lat, start.lon], 14);
    startMarker.openPopup();
    destinationMarker.openPopup();
  }
}

function initMapPage() {
  const backBtn = document.getElementById('backBtn');
  const selection = readSelection();

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (!selection || !selection.start || !selection.destination) {
    const summary = document.getElementById('routeSummary');
    if (summary) {
      summary.innerHTML = 'No route selected yet. Go back to the search page and choose a destination.';
    }
    const distanceValue = document.getElementById('distanceValue');
    if (distanceValue) {
      distanceValue.textContent = '--';
    }
    return;
  }

  drawRouteForSelection(selection);
}

document.addEventListener('DOMContentLoaded', () => {
  const pageType = document.body.dataset.page;

  if (pageType === 'map') {
    initMapPage();
    return;
  }

  initLandingPage();
});