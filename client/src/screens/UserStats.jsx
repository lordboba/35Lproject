import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function UserStats() {
    const [userStats, setUserStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Establish connection to the database
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    //get the user by firebase_uid
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
                    console.error('Error fetching user stats:', error);
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
    }, []);
    
    if (loading) {
        return <div>Loading user statistics...</div>;
    }
    //return error
    if (error) {
        return <div>Error loading statistics: {error}</div>;
    }

    if (!userStats) {
        return <div>No user data available</div>;
    }

    return (
        <div>
            <h1>User Statistics for {userStats.name || 'A User with no name'}</h1>
            <h2>Vietcong Statistics</h2>
            <p>Vietcong Games Played: {userStats.stats.vietcong.games}</p>
            <p>First Place Finishes: {userStats.stats.vietcong.place_finishes[1]}</p>
            <p>Second Place Finishes: {userStats.stats.vietcong.place_finishes[2]}</p>
            <p>Third Place Finishes: {userStats.stats.vietcong.place_finishes[3]}</p>
            <h2>Fish Statistics</h2>
            <p>Fish Games Played: {userStats.stats.fish.games}</p>
            <p>Fish Games Won: {userStats.stats.fish.wins}</p>
            <p>Total Claims Made: {userStats.stats.fish.claims}</p>
            <p>Total Sucessful Claims: {userStats.stats.fish.successful_claims}</p>
        </div>
    );
}

export default UserStats;