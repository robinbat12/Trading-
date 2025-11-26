import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Journal } from './pages/Journal';
import { Analytics } from './pages/Analytics';
import { Capital } from './pages/Capital';
import { Calculator } from './pages/Calculator';
import { getTrades, saveTrade, deleteTrade } from './services/storage';
import { getCurrentUser, getCurrentSession } from './services/auth';
import { Trade, User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for valid session
    const session = getCurrentSession();
    if (session) {
      const u = getCurrentUser();
      if (u) {
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
        });
        // Load user's trades
        const userTrades = getTrades(u.id);
        setTrades(userTrades);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (newUser: { id: string; email: string; name: string }) => {
    setUser(newUser);
    // Load user's trades after login
    const userTrades = getTrades(newUser.id);
    setTrades(userTrades);
  };

  const handleLogout = () => {
    setUser(null);
    setTrades([]);
  };

  const handleSaveTrade = (trade: Trade) => {
    if (!user) return;
    trade.userId = user.id;
    const updatedTrades = saveTrade(trade);
    setTrades(updatedTrades);
  };

  const handleDeleteTrade = (id: string) => {
    if (!user) return;
    const updatedTrades = deleteTrade(id, user.id);
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