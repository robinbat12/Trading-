import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, LineChart, LogOut, Hexagon, Calculator } from 'lucide-react';
import { logoutUser } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    onLogout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Journal', icon: BookOpen, path: '/journal' },
    { name: 'Calculator', icon: Calculator, path: '/calculator' },
    { name: 'Analytics', icon: LineChart, path: '/analytics' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row">
      {/* Mobile Sidebar / Header */}
      <aside className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
             <Hexagon className="text-white w-6 h-6 fill-emerald-600 stroke-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">TradeMind</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600/10 text-emerald-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-3">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                 {user?.name.charAt(0).toUpperCase()}
             </div>
             <div className="overflow-hidden">
                 <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                 <p className="text-xs text-slate-500 truncate">{user?.email}</p>
             </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
        </div>
      </main>
    </div>
  );
};