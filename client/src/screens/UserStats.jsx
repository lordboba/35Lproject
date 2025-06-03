import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE_URL } from '../config';
import { useParams } from 'react-router-dom';

function UserStats() {
    const [userStats, setUserStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { id } = useParams();

    useEffect(() => {
        async function fetchUserStatsById(userId) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${userId}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch user data: ${response.status}`);
                }
                const userData = await response.json();
                setUserStats(userData);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            fetchUserStatsById(id);
        } else {
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/users/initialize`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ firebase_uid: currentUser.uid }),
                        });
                        if (!response.ok) {
                            throw new Error(`Failed to fetch user data: ${response.status}`);
                        }
                        const userData = await response.json();
                        setUserStats(userData);
                    } catch (error) {
                        setError(error.message);
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                    setError('User not authenticated');
                }
            });
            return () => unsubscribe();
        }
    }, [id]);
    
    if (loading) {
        return <div>Loading user statistics...</div>;
    }
    if (error) {
        return <div>Error loading statistics: {error}</div>;
    }
    if (!userStats) {
        return <div>No user data available</div>;
    }

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--table-text, #222)' }}>User Statistics for {userStats.name || 'A User with no name'}</h1>
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
        </div>
    );
}

export default UserStats;