import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

function PlayerSearch() {
    const [filters, setFilters] = useState({
        name: '',
        min_fish_games: '',
        min_vietcong_games: '',
        min_fish_win_rate: '',
        min_vietcong_score_rate: '',
        min_claims: '',
        min_claim_rate: '',
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults([]);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== '' && value !== null) params.append(key, value);
            });
            const response = await fetch(`${API_BASE_URL}/users/search?${params.toString()}`);
            if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
            const data = await response.json();
            setResults(data.users || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (user) => {
        navigate(`/app/stats/${user.id || user._id}`);
    };

    useEffect(() => {
        handleSearch({ preventDefault: () => {} });
        // eslint-disable-next-line
    }, []);

    return (
        <div>
            <h1>Player Search</h1>
            <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <input name="name" value={filters.name} onChange={handleChange} placeholder="Username (partial)" />
                <input name="min_fish_games" value={filters.min_fish_games} onChange={handleChange} placeholder="Min Fish Games" type="number" min="0" />
                <input name="min_vietcong_games" value={filters.min_vietcong_games} onChange={handleChange} placeholder="Min Vietcong Games" type="number" min="0" />
                <input name="min_fish_win_rate" value={filters.min_fish_win_rate} onChange={handleChange} placeholder="Min Fish Win Rate (0-1)" type="number" step="0.01" min="0" max="1" style={{ width: '140px' }} />
                <input name="min_vietcong_score_rate" value={filters.min_vietcong_score_rate} onChange={handleChange} placeholder="Min Weighted Win Rate (0-1)" type="number" step="0.01" min="0" max="1" style={{ width: '170px' }} />
                <input name="min_claims" value={filters.min_claims} onChange={handleChange} placeholder="Min Claims" type="number" min="0" />
                <input name="min_claim_rate" value={filters.min_claim_rate} onChange={handleChange} placeholder="Min Claim Rate (0-1)" type="number" step="0.01" min="0" max="1" style={{ width: '140px' }} />
                <button type="submit" disabled={loading}>Search</button>
            </form>
            {loading && <div>Searching...</div>}
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}
            <div style={{ overflowX: 'auto', maxHeight: '60vh', border: '1px solid #ccc', borderRadius: '8px', background: 'var(--table-bg, #fff)' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px', color: 'var(--table-text, #222)' }}>
                    <thead>
                        <tr style={{ position: 'sticky', top: 0, background: 'var(--table-header-bg, #f8f8f8)', zIndex: 2 }}>
                            <th rowSpan={2} style={{ border: '1px solid #ccc', padding: '8px', background: 'var(--table-header-cell, #f0f0f0)', minWidth: '180px', width: '220px' }}>Name</th>
                            <th colSpan={5} style={{ border: '1px solid #ccc', padding: '8px', background: '#e0f7fa', color: '#222' }}>Fish Stats</th>
                            <th colSpan={6} style={{ border: '1px solid #ccc', padding: '8px', background: '#ffe0b2', color: '#222' }}>Viet Cong Stats</th>
                        </tr>
                        <tr style={{ position: 'sticky', top: 32, background: 'var(--table-header-bg, #f8f8f8)', zIndex: 1 }}>
                            {/* Fish Stats */}
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Games</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Wins</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px', minWidth: '70px', width: '80px' }}>Claims</th>
                            <th style={{ border: '1px solid #ccc', padding: '4px', minWidth: '50px', width: '60px' }}>Successful Claims</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Win Rate</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Games</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>1st Place</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>2nd Place</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>3rd Place</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>4th Place</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Weighted Win Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.length === 0 && !loading && (
                            <tr><td colSpan={12} style={{ textAlign: 'center', padding: '16px' }}>No users found.</td></tr>
                        )}
                        {results.map((user) => {
                            const fish = user.stats?.fish || {};
                            const vietcong = user.stats?.vietcong || {};
                            const fishWinRate = fish.games ? (fish.wins / fish.games).toFixed(2) : 'N/A';
                            const claimRate = fish.claims ? (fish.successful_claims / fish.claims).toFixed(2) : 'N/A';
                            const vietScore = vietcong.games ? (((vietcong.place_finishes?.first || 0) * 1.0 + (vietcong.place_finishes?.second || 0) * 0.6 + (vietcong.place_finishes?.third || 0) * 0.3) / vietcong.games).toFixed(2) : 'N/A';
                            return (
                                <tr key={user.id || user._id} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => handleRowClick(user)}>
                                    <td style={{ border: '1px solid #ccc', padding: '8px', background: 'var(--table-row-bg, #fafafa)', minWidth: '180px', width: '220px', color: 'var(--table-text, #222)' }}><strong>{user.name || '(no name)'}</strong></td>
                                    {/* Fish Stats */}
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{fish.games || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{fish.wins || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px', minWidth: '70px', width: '80px' }}>{fish.claims || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '4px', minWidth: '50px', width: '60px' }}>{fish.successful_claims || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{fishWinRate}</td>
                                    {/* Viet Cong Stats */}
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{vietcong.games || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{vietcong.place_finishes?.first || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{vietcong.place_finishes?.second || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{vietcong.place_finishes?.third || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{vietcong.place_finishes?.fourth || 0}</td>
                                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{vietScore}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PlayerSearch; 