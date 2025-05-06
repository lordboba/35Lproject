import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [username, setUsername] = useState('');
  return (
    <>
      <div>
      </div>
      <h1>multiplayer card games :D</h1>
      <button>join game</button>
      <button>create game</button>
      <button>sign in</button>
      <button onClick={() => fetch('http://localhost:8000/')}>test connection</button>
    </>
  )
}

export default App
