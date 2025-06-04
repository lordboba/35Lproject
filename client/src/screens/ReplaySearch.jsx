import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function ReplaySearch() {
    const [filters, setFilters] = useState({
        player_id: '',
        result_codes: [],
        start_time: '',
        end_time: '',
        type: '',
        name: ''
    });

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Available result codes (adjust based on your game logic)
    const gameTypes = ['fish', 'vietcong']; // Based on your API

    const getPlaceColor = (place) => {
        switch(place) {
            case 1:
                return { backgroundColor: '#FFD700', color: '#000' }; // Gold
            case 2:
                return { backgroundColor: '#C0C0C0', color: '#000' }; // Silver
            case 3:
                return { backgroundColor: '#CD7F32', color: '#fff' }; // Bronze
            default:
                return { backgroundColor: '#e9ecef', color: '#000' }; // Default gray
        }
    };
    const placeArr = [ "0th", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th" ];

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleResultCodeChange = (code, isChecked) => {
        setFilters(prev => ({
            ...prev,
            result_codes: isChecked
                ? [...prev.result_codes, code]
                : prev.result_codes.filter(c => c !== code)
        }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const params = new URLSearchParams();

            // Add filters to params
            Object.entries(filters).forEach(([key, value]) => {
                if (key === 'result_codes' && Array.isArray(value) && value.length > 0) {
                    value.forEach(code => params.append('result_codes', code));
                } else if (value !== '' && value !== null && !Array.isArray(value)) {
                    params.append(key, value);
                }
            });

            const response = await fetch(`${API_BASE_URL}/replays/search?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch replays: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data); // Debug log

            // Handle different response formats
            if (Array.isArray(data)) {
                setResults(data);
            } else if (data && Array.isArray(data.replays)) {
                setResults(data.replays);
            } else {
                console.error('Unexpected response format:', data);
                setResults([]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-search on page load
    useEffect(() => {
        handleSearch({ preventDefault: () => {} });
    }, []);

    const handleClearFilters = () => {
        setFilters({
            player_id: '',
            result_codes: [],
            start_time: '',
            end_time: '',
            type: '',
            name: ''
        });
        setResults([]);
        setError(null);
    };

    const viewReplay = (replayId) => {
        navigate(`/app/replay?id=${replayId}`);
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const getPlayerCount = (players) => {
        return Object.keys(players || {}).length;
    };

    return (
        <div className="replay-search-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Replay Search</h1>

            {/* Search Filters */}
            <form onSubmit={handleSearch} style={{
                      backgroundColor: '#f5f5f5',
                      padding: '20px',
                      borderRadius: '8px',
                      marginBottom: '20px'
                  }}>
                {/* Row 1: Player ID and Result Codes */}
                <div style={{
                         display: 'grid',
                         gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                         gap: '15px',
                         color: 'black',
                         marginBottom: '15px'
                     }}>
                    {/* Player ID */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Player Name:
                        </label>
                        <input
                            type="text"
                            value={filters.player_id}
                            onChange={(e) => handleFilterChange('player_id', e.target.value)}
                            placeholder="Enter player ID"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                </div>

                {/* Row 2: Other filters */}
                <div style={{
                         display: 'grid',
                         gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                         gap: '15px',
                         color: 'black'
                     }}>
                    {/* Game Name */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Game Name:
                        </label>
                        <input
                            type="text"
                            value={filters.name}
                            onChange={(e) => handleFilterChange('name', e.target.value)}
                            placeholder="Enter game name"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>

                    {/* Game Type */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Game Type:
                        </label>
                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">All Types</option>
                            {gameTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Start Date:
                        </label>
                        <input
                            type="datetime-local"
                            value={filters.start_time}
                            onChange={(e) => handleFilterChange('start_time', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            End Date:
                        </label>
                        <input
                            type="datetime-local"
                            value={filters.end_time}
                            onChange={(e) => handleFilterChange('end_time', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Searching...' : 'Search Replays'}
                    </button>

                    <button
                        type="button"
                        onClick={handleClearFilters}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            </form>

            
            {/* Error Display */}
            {error && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    border: '1px solid #f5c6cb'
                }}>
                    Error: {error}
                </div>
            )}

            {/* Results */}
            <div>
                <h2>Search Results ({Array.isArray(results) ? results.length : 0} found)</h2>

                {(!Array.isArray(results) || results.length === 0) && !loading ? (
                    <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                        No replays found. Try adjusting your search filters.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {Array.isArray(results) && results.map((replay) => (
                            <div
                                key={replay._id}
                                style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    padding: '15px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                                            {replay.name || 'Unnamed Game'}
                                        </h3>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', color: 'black' }}>
                                            <div>
                                                <strong>Type:</strong> {replay.type}
                                            </div>
                                            <div>
                                                <strong>Players:</strong> {getPlayerCount(replay.players)}
                                            </div>
                                            <div>
                                                <strong>Date:</strong> {formatDate(replay.timestamp)}
                                            </div>
                                        </div>

                                        {/* Player Results */}
                                        {replay.players && Object.keys(replay.players).length > 0 && (
                                            <div style={{ marginTop: '10px', color: 'black'}}>
                                                <strong>Player Results:</strong>
                                                <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {Object.entries(replay.players)
                                                .sort(([, a], [, b]) => a - b)
                                                .map(([playerId, result]) => {
                                                    const isFish = replay.type === 'fish';
                                                    const label = isFish
                                                        ? result === 1 ? 'Win' : 'Loss'
                                                        : placeArr[result] || `${result}th`;

                                                    const style = isFish
                                                        ? {
                                                            backgroundColor: result === 1 ? '#28a745' : '#dc3545',
                                                            color: 'white'
                                                        }
                                                        : getPlaceColor(result);

                                                    return (
                                                        <span
                                                            key={playerId}
                                                            style={{
                                                                ...style,
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.9em'
                                                            }}
                                                        >
                                                            <b>{label}</b>: {playerId}
                                                        </span>
                                                    );
                                                })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => viewReplay(replay._id)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#28a745',
                                            color: 'black',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            marginLeft: '15px'
                                        }}
                                    >
                                        View Replay
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReplaySearch;
