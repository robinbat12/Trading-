import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Hexagon, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { signup, login, verifyEmail, resendVerificationEmail, AuthError } from '../services/auth';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [emailValidation, setEmailValidation] = useState<{ valid: boolean; message?: string } | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<{ valid: boolean; message?: string } | null>(null);

  // Check for verification token in URL
  useEffect(() => {
    const token = searchParams.get('verify');
    if (token) {
      handleVerifyEmail(token);
    }
  }, [searchParams]);

  // Live email validation
  useEffect(() => {
    if (email && !isLogin) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(email)) {
        setEmailValidation({ valid: false, message: 'Invalid email format' });
      } else {
        setEmailValidation({ valid: true });
      }
    } else {
      setEmailValidation(null);
    }
  }, [email, isLogin]);

  // Live password validation
  useEffect(() => {
    if (password && !isLogin) {
      if (password.length < 8) {
        setPasswordValidation({ valid: false, message: 'At least 8 characters' });
      } else if (!/[A-Z]/.test(password)) {
        setPasswordValidation({ valid: false, message: 'Need uppercase letter' });
      } else if (!/[a-z]/.test(password)) {
        setPasswordValidation({ valid: false, message: 'Need lowercase letter' });
      } else if (!/[0-9]/.test(password)) {
        setPasswordValidation({ valid: false, message: 'Need a number' });
      } else {
        setPasswordValidation({ valid: true });
      }
    } else {
      setPasswordValidation(null);
    }
  }, [password, isLogin]);

  const handleVerifyEmail = async (token: string) => {
    setIsLoading(true);
    setError(null);
    const result = verifyEmail(token);
    setIsLoading(false);

    if (result.success) {
      setSuccess('Email verified successfully! You can now log in.');
      setIsLogin(true);
      setVerificationToken(null);
      navigate('/auth');
    } else {
      setError(result.error?.message || 'Verification failed');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setEmailSent(false);

    if (!emailValidation?.valid || !passwordValidation?.valid) {
      setError('Please fix validation errors');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup(email, password, name);
      setIsLoading(false);

      if (result.success && result.verificationToken) {
        setEmailSent(true);
        setVerificationToken(result.verificationToken);
        setSuccess('Account created! Check your email for verification link.');
        // In production, email would be sent. For demo, show token in console
        console.log('Verification token (demo):', result.verificationToken);
        console.log('Verification URL:', `${window.location.origin}/#/auth?verify=${result.verificationToken}`);
      } else {
        setError(result.error?.message || 'Signup failed');
      }
    } catch (err) {
      setIsLoading(false);
      setError('An unexpected error occurred');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const result = login(email, password);
      setIsLoading(false);

      if (result.success && result.session) {
        onLogin({
          id: result.session.userId,
          email: result.session.email,
          name: result.session.name,
        });
        navigate('/');
      } else {
        const errorMsg = result.error?.message || 'Login failed';
        setError(errorMsg);

        // If email not verified, offer resend
        if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
          setVerificationToken('pending');
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError('An unexpected error occurred');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    const result = resendVerificationEmail(email);
    setIsLoading(false);

    if (result.success && result.verificationToken) {
      setSuccess('Verification email sent! Check your inbox.');
      setVerificationToken(result.verificationToken);
      console.log('New verification token (demo):', result.verificationToken);
      console.log('Verification URL:', `${window.location.origin}/#/auth?verify=${result.verificationToken}`);
    } else {
      setError(result.error?.message || 'Failed to resend verification email');
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement password reset flow
    alert('Password reset feature coming soon!');
  };

  // Email sent confirmation screen
  if (emailSent && verificationToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl text-center">
          <div className="inline-flex bg-emerald-600/20 p-3 rounded-xl mb-4">
            <Mail className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
          <p className="text-slate-400">
            We've sent a verification link to <strong className="text-white">{email}</strong>
          </p>
          <p className="text-sm text-slate-500">
            Click the link in the email to verify your account. The link expires in 1 hour.
          </p>
          <div className="bg-slate-800 p-4 rounded-lg text-left">
            <p className="text-xs text-slate-400 mb-2">Demo Mode - Verification Link:</p>
            <code className="text-xs text-emerald-400 break-all">
              {window.location.origin}/#/auth?verify={verificationToken}
            </code>
            <p className="text-xs text-slate-500 mt-2">
              Click this link or copy it to verify your account.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              variant="secondary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Resend Verification Email'}
            </Button>
            <button
              onClick={() => {
                setEmailSent(false);
                setVerificationToken(null);
                setIsLogin(true);
              }}
              className="text-sm text-slate-400 hover:text-white"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            {isLogin
              ? 'Enter your credentials to access your journal.'
              : 'Start your journey to profitable trading.'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-rose-200">{error}</p>
              {verificationToken === 'pending' && (
                <button
                  onClick={handleResendVerification}
                  className="text-xs text-rose-300 hover:text-rose-100 underline mt-1"
                >
                  Resend verification email
                </button>
              )}
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-200">{success}</p>
          </div>
        )}

        <form
          className="mt-8 space-y-6"
          onSubmit={isLogin ? handleLogin : handleSignup}
        >
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@example.com"
                error={emailValidation?.valid === false ? emailValidation.message : undefined}
              />
              {emailValidation?.valid === true && (
                <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Valid email
                </p>
              )}
            </div>
            <div>
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                error={passwordValidation?.valid === false ? passwordValidation.message : undefined}
              />
              {!isLogin && passwordValidation && (
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                    <span className={password.length >= 8 ? 'text-emerald-500' : 'text-slate-500'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                    <span className={/[A-Z]/.test(password) ? 'text-emerald-500' : 'text-slate-500'}>
                      Uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[a-z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                    <span className={/[a-z]/.test(password) ? 'text-emerald-500' : 'text-slate-500'}>
                      Lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                    <span className={/[0-9]/.test(password) ? 'text-emerald-500' : 'text-slate-500'}>
                      Number
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-slate-400">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-emerald-500 hover:text-emerald-400"
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading
              ? 'Processing...'
              : isLogin
              ? 'Sign In'
              : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-slate-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
              setEmailSent(false);
              setVerificationToken(null);
            }}
            className="text-emerald-500 font-medium hover:text-emerald-400"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
