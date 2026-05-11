import { useEffect, useState } from 'react'
import NewsCard from './components/NewsCard'
import BreakingBanner from './components/BreakingBanner'
import Sidebar from './components/Sidebar'
import socket from './services/socket'

export default function App() {
  const [articles, setArticles] = useState([])
  const [breaking, setBreaking] = useState('Live global news stream active')

  useEffect(() => {
    socket.on('news_update', data => {
      setArticles(prev => [data, ...prev])
    })

    socket.on('breaking_alert', data => {
      setBreaking(data.message)
    })

    return () => {
      socket.off('news_update')
      socket.off('breaking_alert')
    }
  }, [])

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-5xl font-black mb-6 text-cyan-400">
        PulseWire AI
      </h1>

      <BreakingBanner text={breaking} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-1">
          <Sidebar />
}