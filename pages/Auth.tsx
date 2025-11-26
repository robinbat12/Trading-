import React, { useState } from 'react';
import { Hexagon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { loginUser } from '../services/storage';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
        const user = loginUser(email);
        onLogin(user);
        setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex bg-emerald-600/20 p-3 rounded-xl mb-4">
             <Hexagon className="w-8 h-8 text-emerald-500 fill-emerald-500/20" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-2 text-slate-400">
            {isLogin ? 'Enter your credentials to access your journal.' : 'Start your journey to profitable trading.'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@example.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
             <label className="flex items-center text-slate-400">
                 <input type="checkbox" className="mr-2 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500" />
                 Remember me
             </label>
             <button type="button" className="text-emerald-500 hover:text-emerald-400">Forgot password?</button>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </Button>
        </form>
        
        <div className="text-center text-sm">
            <span className="text-slate-400">{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
            <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-emerald-500 font-medium hover:text-emerald-400"
            >
                {isLogin ? 'Sign up' : 'Sign in'}
            </button>
        </div>
      </div>
    </div>
  );
};