import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Journal } from './pages/Journal';
import { Analytics } from './pages/Analytics';
import { Capital } from './pages/Capital';
import { Calculator } from './pages/Calculator';
import { getTrades, saveTrade, deleteTrade, getCurrentUser } from './services/storage';
import { Trade, User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial data
    const u = getCurrentUser();
    if (u) setUser(u);
    
    const t = getTrades();
    setTrades(t);
    
    setLoading(false);
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleSaveTrade = (trade: Trade) => {
    const updatedTrades = saveTrade(trade);
    setTrades(updatedTrades);
  };

  const handleDeleteTrade = (id: string) => {
    const updatedTrades = deleteTrade(id);
    setTrades(updatedTrades);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">Loading TradeMind...</div>;

  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={!user ? <Auth onLogin={handleLogin} /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <Layout user={user} onLogout={handleLogout}><Dashboard trades={trades} /></Layout> : <Navigate to="/auth" />} />
        
        <Route path="/journal" element={user ? <Layout user={user} onLogout={handleLogout}><Journal trades={trades} onSave={handleSaveTrade} onDelete={handleDeleteTrade} /></Layout> : <Navigate to="/auth" />} />

        <Route path="/calculator" element={user ? <Layout user={user} onLogout={handleLogout}><Calculator /></Layout> : <Navigate to="/auth" />} />
        
        <Route path="/capital" element={user ? <Layout user={user} onLogout={handleLogout}><Capital trades={trades} /></Layout> : <Navigate to="/auth" />} />
        
        <Route path="/analytics" element={user ? <Layout user={user} onLogout={handleLogout}><Analytics trades={trades} /></Layout> : <Navigate to="/auth" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;