const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5432;

// Enable CORS for all routes
app.use(cors({
  origin: [
    'https://neighborhood-project-1.onrender.com',
    'http://localhost:3000'
  ]
}));

// Parse JSON bodies
app.use(express.json());

// Basic GET route at root
app.get('/', (req, res) => {
  res.json({ message: 'Backend is working' });
});

// GET API for neighborhood data from Overpass API
app.get('/api/neighborhood-data', async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query;
    
    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required parameters' 
      });
    }

    // Validate parameter types
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
      return res.status(400).json({ 
        error: 'Latitude, longitude, and radius must be valid numbers' 
      });
    }

    // Overpass API query to fetch various amenities
    const overpassQuery = `
      [out:json][timeout:25];
      (
        // Parks
        node["leisure"="park"](around:${rad},${lat},${lon});
        way["leisure"="park"](around:${rad},${lat},${lon});
        relation["leisure"="park"](around:${rad},${lat},${lon});
        
        // Cafes
        node["amenity"="cafe"](around:${rad},${lat},${lon});
        way["amenity"="cafe"](around:${rad},${lat},${lon});
        relation["amenity"="cafe"](around:${rad},${lat},${lon});
        
        // Gyms
        node["leisure"="fitness_centre"](around:${rad},${lat},${lon});
        way["leisure"="fitness_centre"](around:${rad},${lat},${lon});
        relation["leisure"="fitness_centre"](around:${rad},${lat},${lon});
        
        // Bus stops
        node["highway"="bus_stop"](around:${rad},${lat},${lon});
        
        // Train stations
        node["railway"="station"](around:${rad},${lat},${lon});
        way["railway"="station"](around:${rad},${lat},${lon});
        relation["railway"="station"](around:${rad},${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;

    // Make request to Overpass API
    const response = await axios.get('https://overpass-api.de/api/interpreter', {
      params: {
        data: overpassQuery
      },
      timeout: 30000 // 30 second timeout
    });

    // Process and categorize the data
    const elements = response.data.elements || [];
    const categorizedData = {
      parks: [],
      cafes: [],
      gyms: [],
      busStops: [],
      trainStations: []
    };

    elements.forEach(element => {
      const tags = element.tags || {};
      
      if (tags.leisure === 'park') {
        categorizedData.parks.push({
          id: element.id,
          type: element.type,
          lat: element.lat,
          lon: element.lon,
          name: tags.name || 'Unnamed Park',
          tags: tags
        });
      } else if (tags.amenity === 'cafe') {
        categorizedData.cafes.push({
          id: element.id,
          type: element.type,
          lat: element.lat,
          lon: element.lon,
          name: tags.name || 'Unnamed Cafe',
          tags: tags
        });
      } else if (tags.leisure === 'fitness_centre') {
        categorizedData.gyms.push({
          id: element.id,
          type: element.type,
          lat: element.lat,
          lon: element.lon,
          name: tags.name || 'Unnamed Gym',
          tags: tags
        });
      } else if (tags.highway === 'bus_stop') {
        categorizedData.busStops.push({
          id: element.id,
          type: element.type,
          lat: element.lat,
          lon: element.lon,
          name: tags.name || 'Bus Stop',
          tags: tags
        });
      } else if (tags.railway === 'station') {
        categorizedData.trainStations.push({
          id: element.id,
          type: element.type,
          lat: element.lat,
          lon: element.lon,
          name: tags.name || 'Train Station',
          tags: tags
        });
      }
    });

    // Return the categorized data
    res.json({
      success: true,
      query: {
        latitude: lat,
        longitude: lon,
        radius: rad
      },
      data: categorizedData,
      summary: {
        total: elements.length,
        parks: categorizedData.parks.length,
        cafes: categorizedData.cafes.length,
        gyms: categorizedData.gyms.length,
        busStops: categorizedData.busStops.length,
        trainStations: categorizedData.trainStations.length
      }
    });

  } catch (error) {
    console.error('Error fetching neighborhood data:', error.message);
    
    if (error.response) {
      // Overpass API error
      res.status(500).json({
        error: 'Failed to fetch data from Overpass API',
        details: error.response.data || error.message
      });
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      res.status(408).json({
        error: 'Request timeout - the query may be too complex or the radius too large'
      });
    } else {
      // Other errors
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// GET API for crime data
app.get('/api/crime-data', (req, res) => {
  const city = req.query.city;
  // Dummy data for example
  res.json({
    success: true,
    query: { city },
    data: {
      city,
      crimeIndex: 89,
      safetyIndex: 11,
      crimeRate: "89 per 100,000 people",
      population: 18713220,
      country: "US",
      lastUpdated: new Date().toISOString(),
      note: "Data is estimated - consider using a dedicated crime data service for accurate statistics"
    },
    source: "City Data API (Estimated)",
    disclaimer: "Crime data may not be real-time and should be verified with official sources"
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to test the API`);
}); 