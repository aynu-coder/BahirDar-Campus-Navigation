# Bahir Dar University Campus Navigator

A campus navigation web app for Bahir Dar University that calculates routes between two points using a Prolog-based graph search and displays the route on a map.

## Features

- Modern landing page and route-planning interface
- Search by destination and start point
- Use current GPS location
- Leaflet map with route visualization
- Backend route logic powered by SWI-Prolog and A* search

## Project Structure

- `backend/` - Prolog server and graph data
- `frontend/` - HTML, CSS, and JavaScript client
- `cache/` - cached route/search results

## Requirements

- SWI-Prolog installed
- Python 3 for serving the front end
- Modern browser with geolocation support

## Run the application

1. Start the backend server:

   ```bash
   cd backend
   swipl -g "consult('server.pl'), start_server."
   ```

2. Start the frontend server:

   ```bash
   cd frontend
   python -m http.server 8000
   ```

3. Open the app in a browser:

   ```text
   http://localhost:8000/index.html
   ```

## Backend API

The frontend communicates with the Prolog server at:

- `http://localhost:5000/route`

It accepts a JSON payload like:

```json
{
  "start_lat": 11.589,
  "start_lon": 37.392,
  "goal_lat": 11.600,
  "goal_lon": 37.380
}
```

## Notes

- The frontend uses OpenStreetMap tiles through Leaflet.
- The route engine uses the graph data in the backend and returns a path and distance in kilometers.
- The app is designed for the Bahir Dar University campus navigation use case and can be extended with more nodes or landmarks.
