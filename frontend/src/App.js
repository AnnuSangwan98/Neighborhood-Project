import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [neighborhoodData, setNeighborhoodData] = useState(null);
  const [crimeData, setCrimeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    latitude: '40.7128',
    longitude: '-74.0060',
    radius: '1000',
    city: 'New York'
  });
  const [weights, setWeights] = useState({
    parks: 0.15,
    cafes: 0.15,
    gyms: 0.10,
    busStops: 0.20,
    trainStations: 0.20,
    crimeRate: 0.20
  });
  const [showWeights, setShowWeights] = useState(false);

  // Function to calculate neighborhood score
  const calculateNeighborhoodScore = (neighborhoodData, crimeData, weights) => {
    if (!neighborhoodData || !crimeData) return null;

    const radius = parseFloat(neighborhoodData.query.radius);
    const area = Math.PI * Math.pow(radius, 2); // Area in square meters
    const areaKm2 = area / 1000000; // Convert to square kilometers

    // Normalize factors to 0-1 scale
    const factors = {
      // Parks: 0-1 based on density (parks per km²)
      parks: Math.min(neighborhoodData.data.parks.length / (areaKm2 * 2), 1),
      
      // Cafes: 0-1 based on density (cafes per km²)
      cafes: Math.min(neighborhoodData.data.cafes.length / (areaKm2 * 5), 1),
      
      // Gyms: 0-1 based on density (gyms per km²)
      gyms: Math.min(neighborhoodData.data.gyms.length / (areaKm2 * 1), 1),
      
      // Bus stops: 0-1 based on density (bus stops per km²)
      busStops: Math.min(neighborhoodData.data.busStops.length / (areaKm2 * 10), 1),
      
      // Train stations: 0-1 based on density (stations per km²)
      trainStations: Math.min(neighborhoodData.data.trainStations.length / (areaKm2 * 0.5), 1),
      
      // Crime rate: 0-1 (inverted, so lower crime = higher score)
      crimeRate: Math.max(0, 1 - (crimeData.data.crimeIndex / 100))
    };

    // Calculate weighted score
    const weightedScore = Object.keys(factors).reduce((total, factor) => {
      return total + (factors[factor] * weights[factor]);
    }, 0);

    // Calculate individual factor scores
    const factorScores = Object.keys(factors).map(factor => ({
      name: factor,
      normalizedValue: factors[factor],
      weightedScore: factors[factor] * weights[factor],
      weight: weights[factor]
    }));

    return {
      totalScore: Math.round(weightedScore * 100) / 100,
      totalScorePercentage: Math.round(weightedScore * 100),
      factors: factorScores,
      breakdown: {
        parks: {
          count: neighborhoodData.data.parks.length,
          density: Math.round((neighborhoodData.data.parks.length / areaKm2) * 100) / 100,
          normalized: Math.round(factors.parks * 100) / 100,
          score: Math.round(factors.parks * weights.parks * 100) / 100
        },
        cafes: {
          count: neighborhoodData.data.cafes.length,
          density: Math.round((neighborhoodData.data.cafes.length / areaKm2) * 100) / 100,
          normalized: Math.round(factors.cafes * 100) / 100,
          score: Math.round(factors.cafes * weights.cafes * 100) / 100
        },
        gyms: {
          count: neighborhoodData.data.gyms.length,
          density: Math.round((neighborhoodData.data.gyms.length / areaKm2) * 100) / 100,
          normalized: Math.round(factors.gyms * 100) / 100,
          score: Math.round(factors.gyms * weights.gyms * 100) / 100
        },
        busStops: {
          count: neighborhoodData.data.busStops.length,
          density: Math.round((neighborhoodData.data.busStops.length / areaKm2) * 100) / 100,
          normalized: Math.round(factors.busStops * 100) / 100,
          score: Math.round(factors.busStops * weights.busStops * 100) / 100
        },
        trainStations: {
          count: neighborhoodData.data.trainStations.length,
          density: Math.round((neighborhoodData.data.trainStations.length / areaKm2) * 100) / 100,
          normalized: Math.round(factors.trainStations * 100) / 100,
          score: Math.round(factors.trainStations * weights.trainStations * 100) / 100
        },
        crimeRate: {
          crimeIndex: crimeData.data.crimeIndex,
          safetyIndex: crimeData.data.safetyIndex,
          normalized: Math.round(factors.crimeRate * 100) / 100,
          score: Math.round(factors.crimeRate * weights.crimeRate * 100) / 100
        }
      }
    };
  };

  const getScoreLevel = (score) => {
    if (score >= 0.8) return { level: 'Excellent', color: '#4CAF50', emoji: '🏆' };
    if (score >= 0.6) return { level: 'Good', color: '#8BC34A', emoji: '👍' };
    if (score >= 0.4) return { level: 'Fair', color: '#FFC107', emoji: '😐' };
    if (score >= 0.2) return { level: 'Poor', color: '#FF9800', emoji: '😕' };
    return { level: 'Very Poor', color: '#F44336', emoji: '😞' };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch both APIs in parallel
      const [neighborhoodResponse, crimeResponse] = await Promise.all([
        fetch(`http://localhost:5432/api/neighborhood-data?latitude=${searchParams.latitude}&longitude=${searchParams.longitude}&radius=${searchParams.radius}`),
        fetch(`http://localhost:5432/api/crime-data?city=${encodeURIComponent(searchParams.city)}`)
      ]);

      if (!neighborhoodResponse.ok) {
        throw new Error(`Neighborhood API error: ${neighborhoodResponse.status}`);
      }

      if (!crimeResponse.ok) {
        throw new Error(`Crime API error: ${crimeResponse.status}`);
      }

      const neighborhoodResult = await neighborhoodResponse.json();
      const crimeResult = await crimeResponse.json();

      setNeighborhoodData(neighborhoodResult);
      setCrimeData(crimeResult);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWeightChange = (factor, value) => {
    setWeights(prev => ({
      ...prev,
      [factor]: parseFloat(value)
    }));
  };

  const getCrimeLevel = (crimeIndex) => {
    if (crimeIndex <= 20) return { level: 'Very Low', color: '#4CAF50' };
    if (crimeIndex <= 40) return { level: 'Low', color: '#8BC34A' };
    if (crimeIndex <= 60) return { level: 'Moderate', color: '#FFC107' };
    if (crimeIndex <= 80) return { level: 'High', color: '#FF9800' };
    return { level: 'Very High', color: '#F44336' };
  };

  const getSafetyLevel = (safetyIndex) => {
    if (safetyIndex >= 80) return { level: 'Very Safe', color: '#4CAF50' };
    if (safetyIndex >= 60) return { level: 'Safe', color: '#8BC34A' };
    if (safetyIndex >= 40) return { level: 'Moderate', color: '#FFC107' };
    if (safetyIndex >= 20) return { level: 'Unsafe', color: '#FF9800' };
    return { level: 'Very Unsafe', color: '#F44336' };
  };

  // Calculate score when data is available
  const neighborhoodScore = calculateNeighborhoodScore(neighborhoodData, crimeData, weights);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Neighborhood Explorer</h1>
        <p>Discover parks, cafes, gyms, transit, and crime statistics for any location</p>
      </header>

      <main className="App-main">
        {/* Search Form */}
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <label htmlFor="latitude">Latitude:</label>
              <input
                type="number"
                step="any"
                id="latitude"
                name="latitude"
                value={searchParams.latitude}
                onChange={handleInputChange}
                placeholder="40.7128"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="longitude">Longitude:</label>
              <input
                type="number"
                step="any"
                id="longitude"
                name="longitude"
                value={searchParams.longitude}
                onChange={handleInputChange}
                placeholder="-74.0060"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="radius">Radius (meters):</label>
              <input
                type="number"
                id="radius"
                name="radius"
                value={searchParams.radius}
                onChange={handleInputChange}
                placeholder="1000"
                min="100"
                max="10000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">City Name:</label>
              <input
                type="text"
                id="city"
                name="city"
                value={searchParams.city}
                onChange={handleInputChange}
                placeholder="New York"
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Search Location'}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <p>Fetching data...</p>
          </div>
        )}

        {/* Results Display */}
        {!loading && !error && (neighborhoodData || crimeData) && (
          <div className="results-container">
            {/* Neighborhood Score Section */}
            {neighborhoodScore && (
              <div className="data-section score-section">
                <h2>🏆 Neighborhood Score</h2>
                <div className="score-display">
                  <div className="main-score">
                    <div className="score-value" style={{ color: getScoreLevel(neighborhoodScore.totalScore).color }}>
                      {neighborhoodScore.totalScorePercentage}%
                    </div>
                    <div className="score-level">
                      {getScoreLevel(neighborhoodScore.totalScore).emoji} {getScoreLevel(neighborhoodScore.totalScore).level}
                    </div>
                  </div>
                  
                  <button 
                    className="weights-toggle"
                    onClick={() => setShowWeights(!showWeights)}
                  >
                    {showWeights ? 'Hide' : 'Show'} Scoring Weights
                  </button>
                </div>

                {showWeights && (
                  <div className="weights-section">
                    <h3>Adjust Scoring Weights</h3>
                    <div className="weights-grid">
                      {Object.entries(weights).map(([factor, weight]) => (
                        <div key={factor} className="weight-item">
                          <label htmlFor={factor}>
                            {factor === 'parks' && '🌳 Parks'}
                            {factor === 'cafes' && '☕ Cafes'}
                            {factor === 'gyms' && '💪 Gyms'}
                            {factor === 'busStops' && '🚌 Bus Stops'}
                            {factor === 'trainStations' && '🚆 Train Stations'}
                            {factor === 'crimeRate' && '🛡️ Safety'}
                          </label>
                          <input
                            type="range"
                            id={factor}
                            min="0"
                            max="1"
                            step="0.05"
                            value={weight}
                            onChange={(e) => handleWeightChange(factor, e.target.value)}
                          />
                          <span className="weight-value">{Math.round(weight * 100)}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="weight-total">
                      Total: {Math.round(Object.values(weights).reduce((sum, w) => sum + w, 0) * 100)}%
                    </div>
                  </div>
                )}

                <div className="score-breakdown">
                  <h3>Score Breakdown</h3>
                  <div className="breakdown-grid">
                    {Object.entries(neighborhoodScore.breakdown).map(([factor, data]) => (
                      <div key={factor} className="breakdown-item">
                        <div className="factor-name">
                          {factor === 'parks' && '🌳 Parks'}
                          {factor === 'cafes' && '☕ Cafes'}
                          {factor === 'gyms' && '💪 Gyms'}
                          {factor === 'busStops' && '🚌 Bus Stops'}
                          {factor === 'trainStations' && '🚆 Train Stations'}
                          {factor === 'crimeRate' && '🛡️ Safety'}
                        </div>
                        <div className="factor-details">
                          <div className="factor-count">
                            {factor === 'crimeRate' ? `Crime: ${data.crimeIndex}/100` : `${data.count} found`}
                          </div>
                          <div className="factor-density">
                            {factor === 'crimeRate' ? `Safety: ${data.safetyIndex}/100` : `${data.density}/km²`}
                          </div>
                          <div className="factor-score">
                            Score: {data.score.toFixed(2)} ({data.normalized.toFixed(0)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Crime Data Section */}
            {crimeData && (
              <div className="data-section crime-section">
                <h2>Crime Statistics</h2>
                <div className="crime-stats">
                  <div className="stat-card">
                    <h3>Crime Index</h3>
                    <div className="stat-value" style={{ color: getCrimeLevel(crimeData.data.crimeIndex).color }}>
                      {crimeData.data.crimeIndex}/100
                    </div>
                    <div className="stat-label">{getCrimeLevel(crimeData.data.crimeIndex).level}</div>
                  </div>

                  <div className="stat-card">
                    <h3>Safety Index</h3>
                    <div className="stat-value" style={{ color: getSafetyLevel(crimeData.data.safetyIndex).color }}>
                      {crimeData.data.safetyIndex}/100
                    </div>
                    <div className="stat-label">{getSafetyLevel(crimeData.data.safetyIndex).level}</div>
                  </div>

                  <div className="stat-card">
                    <h3>Crime Rate</h3>
                    <div className="stat-value">{crimeData.data.crimeRate}</div>
                  </div>
                </div>

                <div className="data-meta">
                  <p><strong>City:</strong> {crimeData.data.city}</p>
                  {crimeData.data.population && <p><strong>Population:</strong> {crimeData.data.population.toLocaleString()}</p>}
                  {crimeData.data.country && <p><strong>Country:</strong> {crimeData.data.country}</p>}
                  <p><strong>Source:</strong> {crimeData.source}</p>
                  <p><strong>Last Updated:</strong> {new Date(crimeData.data.lastUpdated).toLocaleString()}</p>
                </div>

                {crimeData.data.note && (
                  <div className="note">
                    <p><strong>Note:</strong> {crimeData.data.note}</p>
                  </div>
                )}
              </div>
            )}

            {/* Neighborhood Data Section */}
            {neighborhoodData && (
              <div className="data-section neighborhood-section">
                <h2>Neighborhood Amenities</h2>
                
                <div className="amenities-grid">
                  <div className="amenity-category">
                    <h3>🌳 Parks ({neighborhoodData.summary.parks})</h3>
                    <div className="amenity-list">
                      {neighborhoodData.data.parks.length > 0 ? (
                        neighborhoodData.data.parks.map(park => (
                          <div key={park.id} className="amenity-item">
                            <strong>{park.name}</strong>
                            {park.lat && park.lon && (
                              <div className="coordinates">
                                {park.lat.toFixed(4)}, {park.lon.toFixed(4)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p>No parks found in this area</p>
                      )}
                    </div>
                  </div>

                  <div className="amenity-category">
                    <h3>☕ Cafes ({neighborhoodData.summary.cafes})</h3>
                    <div className="amenity-list">
                      {neighborhoodData.data.cafes.length > 0 ? (
                        neighborhoodData.data.cafes.map(cafe => (
                          <div key={cafe.id} className="amenity-item">
                            <strong>{cafe.name}</strong>
                            {cafe.lat && cafe.lon && (
                              <div className="coordinates">
                                {cafe.lat.toFixed(4)}, {cafe.lon.toFixed(4)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p>No cafes found in this area</p>
                      )}
                    </div>
                  </div>

                  <div className="amenity-category">
                    <h3>💪 Gyms ({neighborhoodData.summary.gyms})</h3>
                    <div className="amenity-list">
                      {neighborhoodData.data.gyms.length > 0 ? (
                        neighborhoodData.data.gyms.map(gym => (
                          <div key={gym.id} className="amenity-item">
                            <strong>{gym.name}</strong>
                            {gym.lat && gym.lon && (
                              <div className="coordinates">
                                {gym.lat.toFixed(4)}, {gym.lon.toFixed(4)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p>No gyms found in this area</p>
                      )}
                    </div>
                  </div>

                  <div className="amenity-category">
                    <h3>🚌 Bus Stops ({neighborhoodData.summary.busStops})</h3>
                    <div className="amenity-list">
                      {neighborhoodData.data.busStops.length > 0 ? (
                        neighborhoodData.data.busStops.map(stop => (
                          <div key={stop.id} className="amenity-item">
                            <strong>{stop.name}</strong>
                            {stop.lat && stop.lon && (
                              <div className="coordinates">
                                {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p>No bus stops found in this area</p>
                      )}
                    </div>
                  </div>

                  <div className="amenity-category">
                    <h3>🚆 Train Stations ({neighborhoodData.summary.trainStations})</h3>
                    <div className="amenity-list">
                      {neighborhoodData.data.trainStations.length > 0 ? (
                        neighborhoodData.data.trainStations.map(station => (
                          <div key={station.id} className="amenity-item">
                            <strong>{station.name}</strong>
                            {station.lat && station.lon && (
                              <div className="coordinates">
                                {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p>No train stations found in this area</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="data-meta">
                  <p><strong>Search Area:</strong> {neighborhoodData.query.radius}m radius around ({neighborhoodData.query.latitude}, {neighborhoodData.query.longitude})</p>
                  <p><strong>Total Amenities Found:</strong> {neighborhoodData.summary.total}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
