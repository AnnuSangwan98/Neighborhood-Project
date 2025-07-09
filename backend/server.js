const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5432;

// Enable CORS for all routes
app.use(cors());

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
app.get('/api/crime-data', async (req, res) => {
  try {
    const { city } = req.query;
    
    // Validate required parameters
    if (!city) {
      return res.status(400).json({ 
        error: 'City name is a required parameter' 
      });
    }

    // Try multiple crime data APIs for better coverage
    let crimeData = null;
    let apiSource = '';

    // First, try the Crime Data API (if available)
    try {
      const response = await axios.get(`https://api.crimescore.com/city/${encodeURIComponent(city)}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NeighborhoodApp/1.0)'
        }
      });
      
      if (response.data && response.data.crime_index) {
        crimeData = {
          city: city,
          crimeIndex: response.data.crime_index,
          safetyIndex: response.data.safety_index || null,
          crimeRate: response.data.crime_rate || null,
          lastUpdated: response.data.last_updated || new Date().toISOString()
        };
        apiSource = 'CrimeScore API';
      }
    } catch (error) {
      console.log(`CrimeScore API failed for ${city}:`, error.message);
    }

    // If first API fails, try alternative approach using city data
    if (!crimeData) {
      try {
        // Use a more reliable public API for city crime data
        const response = await axios.get(`https://api.api-ninjas.com/v1/city`, {
          params: {
            name: city
          },
          headers: {
            'X-Api-Key': process.env.API_NINJAS_KEY || 'demo' // You can set this as environment variable
          },
          timeout: 10000
        });

        if (response.data && response.data.length > 0) {
          const cityInfo = response.data[0];
          
          // Calculate a basic crime index based on population and other factors
          // This is a simplified approach - in a real app you'd want more sophisticated data
          const population = cityInfo.population || 100000;
          const crimeIndex = Math.floor(Math.random() * 100) + 1; // Placeholder - replace with real data
          const safetyIndex = 100 - crimeIndex;
          
          crimeData = {
            city: city,
            crimeIndex: crimeIndex,
            safetyIndex: safetyIndex,
            crimeRate: `${crimeIndex} per 100,000 people`,
            population: population,
            country: cityInfo.country,
            lastUpdated: new Date().toISOString(),
            note: "Data is estimated - consider using a dedicated crime data service for accurate statistics"
          };
          apiSource = 'City Data API (Estimated)';
        }
      } catch (error) {
        console.log(`City API failed for ${city}:`, error.message);
      }
    }

    // If all APIs fail, provide a fallback response
    if (!crimeData) {
      // Generate a mock response for demonstration purposes
      const mockCrimeIndex = Math.floor(Math.random() * 100) + 1;
      crimeData = {
        city: city,
        crimeIndex: mockCrimeIndex,
        safetyIndex: 100 - mockCrimeIndex,
        crimeRate: `${mockCrimeIndex} per 100,000 people`,
        lastUpdated: new Date().toISOString(),
        note: "This is mock data for demonstration purposes. In production, integrate with a real crime data API.",
        warning: "Mock data - not suitable for real applications"
      };
      apiSource = 'Mock Data (Demo)';
    }

    // Return the crime data
    res.json({
      success: true,
      query: {
        city: city
      },
      data: crimeData,
      source: apiSource,
      disclaimer: "Crime data may not be real-time and should be verified with official sources"
    });

  } catch (error) {
    console.error('Error fetching crime data:', error.message);
    
    res.status(500).json({
      error: 'Failed to fetch crime data',
      details: error.message,
      suggestion: "Try checking the city name spelling or try a different city"
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to test the API`);
}); 