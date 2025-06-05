import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL } from '../config';
import { useParams } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';

function UserStats() {
    const [userStats, setUserStats] = useState(null);
    const [userReplays, setUserReplays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replayLoading, setReplayLoading] = useState(true);
    const [error, setError] = useState(null);
    const { id } = useParams();
    const navigate = useNavigate();

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

                        const replayRes = await fetch(`${API_BASE_URL}/replays/search?player_id=${userData["id"]}`);
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

    const viewReplay = (replayId, type) => {
        if (type === 'fish') {
            navigate(`/app/fish-replay?id=${replayId}`);
        } else if (type === 'vietcong') {
            navigate(`/app/vietcong-replay?id=${replayId}`);
        } else {
            navigate(`/app/replay?id=${replayId}`);
        }
    };

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

            <div>
                <h2>Replays ({userReplays.length})</h2>

                {userReplays.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                        No replays found for this user.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {userReplays.map((replay) => (
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
                                                <strong>Players:</strong> {Object.keys(replay.players || {}).length}
                                            </div>
                                            <div>
                                                <strong>Date:</strong> {new Date(replay.timestamp * 1000).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Player Results */}
                                        {replay.players && Object.keys(replay.players).length > 0 && (
                                            <div style={{ marginTop: '10px', color: 'black' }}>
                                                <strong>Player Results:</strong>
                                                <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {Object.entries(replay.players)
                                                        .sort(([, a], [, b]) => a - b)
                                                        .map(([playerId, result]) => {
                                                            const placeArr = ["0th", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
                                                            const getPlaceColor = (place) => {
                                                                switch (place) {
                                                                    case 1:
                                                                        return { backgroundColor: '#FFD700', color: '#000' };
                                                                    case 2:
                                                                        return { backgroundColor: '#C0C0C0', color: '#000' };
                                                                    case 3:
                                                                        return { backgroundColor: '#CD7F32', color: '#fff' };
                                                                    default:
                                                                        return { backgroundColor: '#e9ecef', color: '#000' };
                                                                }
                                                            };
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
                                                                    <b>{label}</b>: {replay.player_names?.[playerId] || playerId}
                                                                </span>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => viewReplay(replay._id, replay.type)}
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

export default UserStats;
