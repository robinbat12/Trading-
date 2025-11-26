import { User, UserSession, AuthError } from '../types';

const USERS_KEY = 'trademind_users';
const SESSION_KEY = 'trademind_session';
const VERIFICATION_TOKENS_KEY = 'trademind_verification_tokens';

// Simple password hashing (in production, use bcrypt or similar)
const hashPassword = (password: string): string => {
  // Simple hash for demo - in production use proper bcrypt
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + password.length.toString();
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

// Email validation
const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Password strength validation
const isStrongPassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Generate verification token
const generateToken = (): string => {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
};

// Get all users
const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

// Save users
const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Signup
export const signup = async (
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: AuthError; verificationToken?: string }> => {
  // Validate email
  if (!isValidEmail(email)) {
    return {
      success: false,
      error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address' },
    };
  }

  // Validate password
  const passwordCheck = isStrongPassword(password);
  if (!passwordCheck.valid) {
    return {
      success: false,
      error: { code: 'WEAK_PASSWORD', message: passwordCheck.error || 'Password is too weak' },
    };
  }

  // Check if email exists
  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return {
      success: false,
      error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
    };
  }

  // Create user
  const now = new Date().toISOString();
  const verificationToken = generateToken();
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const newUser: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name: name.trim(),
    passwordHash: hashPassword(password),
    emailVerified: false,
    verificationToken,
    verificationTokenExpiry: tokenExpiry,
    createdAt: now,
    updatedAt: now,
  };

  users.push(newUser);
  saveUsers(users);

  // Store verification token separately for easy lookup
  const tokens = JSON.parse(localStorage.getItem(VERIFICATION_TOKENS_KEY) || '{}');
  tokens[verificationToken] = {
    userId: newUser.id,
    email: newUser.email,
    expiresAt: tokenExpiry,
  };
  localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));

  return { success: true, verificationToken };
};

// Verify email
export const verifyEmail = (token: string): { success: boolean; error?: AuthError; user?: User } => {
  const tokens = JSON.parse(localStorage.getItem(VERIFICATION_TOKENS_KEY) || '{}');
  const tokenData = tokens[token];

  if (!tokenData) {
    return {
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Invalid verification token' },
    };
  }

  if (new Date(tokenData.expiresAt) < new Date()) {
    delete tokens[token];
    localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));
    return {
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Verification token has expired. Please request a new one.' },
    };
  }

  const users = getUsers();
  const user = users.find((u) => u.id === tokenData.userId);

  if (!user) {
    return {
      success: false,
      error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' },
    };
  }

  // Mark as verified
  user.emailVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  user.updatedAt = new Date().toISOString();

  saveUsers(users);

  // Remove token
  delete tokens[token];
  localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));

  return { success: true, user };
};

// Resend verification email
export const resendVerificationEmail = (email: string): { success: boolean; error?: AuthError; verificationToken?: string } => {
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return {
      success: false,
      error: { code: 'ACCOUNT_NOT_FOUND', message: 'No account found with this email' },
    };
  }

  if (user.emailVerified) {
    return {
      success: false,
      error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email is already verified' },
    };
  }

  // Generate new token
  const verificationToken = generateToken();
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  user.verificationToken = verificationToken;
  user.verificationTokenExpiry = tokenExpiry;
  user.updatedAt = new Date().toISOString();

  saveUsers(users);

  // Store token
  const tokens = JSON.parse(localStorage.getItem(VERIFICATION_TOKENS_KEY) || '{}');
  tokens[verificationToken] = {
    userId: user.id,
    email: user.email,
    expiresAt: tokenExpiry,
  };
  localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));

  return { success: true, verificationToken };
};

// Login
export const login = (
  email: string,
  password: string
): { success: boolean; error?: AuthError; session?: UserSession } => {
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    };
  }

  if (!user.emailVerified) {
    return {
      success: false,
      error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email to continue' },
    };
  }

  // Create session
  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const session: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    token: sessionToken,
    expiresAt,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, session };
};

// Get current session
export const getCurrentSession = (): UserSession | null => {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;

  const session: UserSession = JSON.parse(data);

  // Check if expired
  if (new Date(session.expiresAt) < new Date()) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  return session;
};

// Get current user from session
export const getCurrentUser = (): User | null => {
  const session = getCurrentSession();
  if (!session) return null;

  const users = getUsers();
  return users.find((u) => u.id === session.userId) || null;
};

// Logout
export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

// Forgot password - generate reset token
export const requestPasswordReset = (email: string): { success: boolean; error?: AuthError; resetToken?: string } => {
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Don't reveal if email exists for security
    return { success: true };
  }

  const resetToken = generateToken();
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordTokenExpiry = tokenExpiry;
  user.updatedAt = new Date().toISOString();

  saveUsers(users);

  return { success: true, resetToken };
};

// Reset password
export const resetPassword = (
  token: string,
  newPassword: string
): { success: boolean; error?: AuthError } => {
  const passwordCheck = isStrongPassword(newPassword);
  if (!passwordCheck.valid) {
    return {
      success: false,
      error: { code: 'WEAK_PASSWORD', message: passwordCheck.error || 'Password is too weak' },
    };
  }

  const users = getUsers();
  const user = users.find((u) => u.resetPasswordToken === token);

  if (!user) {
    return {
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Invalid reset token' },
    };
  }

  if (!user.resetPasswordTokenExpiry || new Date(user.resetPasswordTokenExpiry) < new Date()) {
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiry = undefined;
    saveUsers(users);
    return {
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired' },
    };
  }

  user.passwordHash = hashPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpiry = undefined;
  user.updatedAt = new Date().toISOString();

  saveUsers(users);

  return { success: true };
};

