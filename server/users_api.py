import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL } from '../config';
import { useParams } from 'react-router-dom';

function UserStats() {
    const [userStats, setUserStats] = useState(null);
    const [userReplays, setUserReplays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replayLoading, setReplayLoading] = useState(true);
    const [error, setError] = useState(null);
    const { id } = useParams();

    useEffect(() => {
        async function fetchUserData(userId) {
            try {
                const [userRes, replayRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/users/${userId}`),
                    fetch(`${API_BASE_URL}/replays/search?player_id=${userId}`)
                ]);
                if (!userRes.ok) throw new Error(`Failed user: ${userRes.status}`);
                if (!replayRes.ok) throw new Error(`Failed replays: ${replayRes.status}`);

                const userData = await userRes.json();
                const replayData = await replayRes.json();

                setUserStats(userData);
                setUserReplays(Array.isArray(replayData) ? replayData : replayData.replays || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
                setReplayLoading(false);
            }
        }

        if (id) {
            fetchUserData(id);
        } else {
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/users/initialize`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ firebase_uid: currentUser.uid }),
                        });
                        if (!res.ok) throw new Error(`User init failed: ${res.status}`);
                        const userData = await res.json();
                        setUserStats(userData);

                        const replayRes = await fetch(`${API_BASE_URL}/replays/search?player_id=${userData._id}`);
                        const replayData = await replayRes.json();
                        setUserReplays(Array.isArray(replayData) ? replayData : replayData.replays || []);
                    } catch (err) {
                        setError(err.message);
                    } finally {
                        setLoading(false);
                        setReplayLoading(false);
                    }
                } else {
                    setLoading(false);
                    setError('User not authenticated');
                }
            });
            return () => unsubscribe();
        }
    }, [id]);

    const getPlaceColor = (place) => {
        switch(place) {
            case 1: return { backgroundColor: '#FFD700', color: '#000' };
            case 2: return { backgroundColor: '#C0C0C0', color: '#000' };
            case 3: return { backgroundColor: '#CD7F32', color: '#fff' };
            default: return { backgroundColor: '#e9ecef', color: '#000' };
        }
    };
    const placeArr = ["0th", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

    const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleString();

    if (loading) return <div>Loading user statistics...</div>;
    if (error) return <div>Error loading statistics: {error}</div>;
    if (!userStats) return <div>No user data available</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--table-text, #222)' }}>
                User Statistics for {userStats.name || 'A User with no name'}
            </h1>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 200, fontSize: '0.95rem', background: 'var(--table-bg, #f9f9f9)', color: 'var(--table-text, #222)', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid var(--table-border, #4442)' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--table-text, #222)' }}>Vietcong Statistics</h2>
                    <div style={{ marginBottom: 4 }}>Games Played: <b>{userStats.stats.vietcong.games}</b></div>
                    <div style={{ marginBottom: 4 }}>First Place Finishes: <b>{userStats.stats.vietcong.place_finishes?.first || 0}</b></div>
                    <div style={{ marginBottom: 4 }}>Second Place Finishes: <b>{userStats.stats.vietcong.place_finishes?.second || 0}</b></div>
                    <div style={{ marginBottom: 4 }}>Third Place Finishes: <b>{userStats.stats.vietcong.place_finishes?.third || 0}</b></div>
                    <div style={{ marginBottom: 4 }}>Fourth Place Finishes: <b>{userStats.stats.vietcong.place_finishes?.fourth || 0}</b></div>
                </div>
                <div style={{ flex: 1, minWidth: 200, fontSize: '0.95rem', background: 'var(--table-bg, #f9f9f9)', color: 'var(--table-text, #222)', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid var(--table-border, #4442)' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--table-text, #222)' }}>Fish Statistics</h2>
                    <div style={{ marginBottom: 4 }}>Games Played: <b>{userStats.stats.fish.games}</b></div>
                    <div style={{ marginBottom: 4 }}>Games Won: <b>{userStats.stats.fish.wins}</b></div>
                    <div style={{ marginBottom: 4 }}>Total Claims Made: <b>{userStats.stats.fish.claims}</b></div>
                    <div style={{ marginBottom: 4 }}>Total Successful Claims: <b>{userStats.stats.fish.successful_claims}</b></div>
                </div>
            </div>

            <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>User Replays</h2>
            {replayLoading ? (
                <p>Loading replays...</p>
            ) : userReplays.length === 0 ? (
                <p>No replays found for this user.</p>
            ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                    {userReplays.map(replay => (
                        <div key={replay._id} style={{
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '15px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <h3>{replay.name || 'Unnamed Game'}</h3>
                            <div><strong>Type:</strong> {replay.type}</div>
                            <div><strong>Date:</strong> {formatDate(replay.timestamp)}</div>
                            <div><strong>Players:</strong> {Object.keys(replay.players || {}).length}</div>
                            <div style={{ marginTop: '10px' }}>
                                <strong>Player Results:</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                                    {Object.entries(replay.players).sort(([, a], [, b]) => a - b).map(([pid, result]) => {
                                        const placeText = replay.type === 'fish'
                                            ? (result === 1 ? 'Win' : 'Loss')
                                            : placeArr[result] || `Place ${result}`;
                                        return (
                                            <span key={pid} style={{
                                                ...getPlaceColor(result),
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.9em'
                                            }}>
                                                <b>{placeText}</b>: {pid}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default UserStats;