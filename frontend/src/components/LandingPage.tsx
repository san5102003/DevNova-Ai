import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { GlassButton } from './GlassButton';
import { 
  Terminal, Shield, Sparkles, Code2, LogIn, UserPlus, AlertCircle, 
  Cpu, KeyRound, Mail, CheckCircle2, ArrowLeft, Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { login } = useStore();
  const [formMode, setFormMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // Forgot Password multi-step state: 1 (Email), 2 (Verify OTP), 3 (New Password), 4 (Success)
  const [resetStep, setResetStep] = useState<1 | 2 | 3 | 4>(1);

  // Form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP Reset inputs
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginOrSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (formMode === 'login') {
        const res = await api.auth.signin(username, password);
        login(res.token, {
          id: res.id,
          username: res.username,
          email: res.email
        });
      } else if (formMode === 'signup') {
        await api.auth.signup(username, email, password);
        setFormMode('login');
        setPassword('');
        setSuccessMessage('Registration successful! Please sign in with your account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.auth.forgotPassword(email);
      setDevOtpHint(res.otp || null);
      setSuccessMessage('Verification OTP sent! Check your email (or use the code below).');
      setResetStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await api.auth.verifyOtp(email, otp);
      setSuccessMessage('OTP code verified! Enter your new password below.');
      setResetStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await api.auth.resetPasswordOtp(email, otp, newPassword, confirmPassword);
      setSuccessMessage('Password updated successfully!');
      setResetStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setFormMode('login');
    setResetStep(1);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDevOtpHint(null);
    if (email) {
      setUsername(email);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row relative bg-dark-300 bg-grid-pattern overflow-y-auto select-none">
      {/* Animated glowing mesh spots */}
      <div className="glow-spot-1 top-[-100px] left-[-150px]"></div>
      <div className="glow-spot-2 bottom-[-100px] right-[-100px]"></div>

      {/* Hero Panel (Left side) */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 z-10">
        <div className="max-w-2xl">
          {/* Logo badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 mb-8 animate-pulse-glow">
            <Sparkles size={14} className="animate-spin-slow text-pink-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-[10px]">AI-Native Cloud Workspace</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tight leading-none mb-6">
            DevNova <span className="text-gradient">AI</span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base lg:text-lg leading-relaxed mb-10 max-w-xl">
            A premium browser-based cloud IDE. Write, compile, and execute multi-file algorithms in **C++**, **Java**, **Python**, and **JavaScript** within secure, resource-limited execution sandboxes.
          </p>

          {/* Grid of features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-all">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                <Code2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Monaco Editor</h4>
                <p className="text-[11px] text-slate-500 mt-1">Multi-file tree explorer with syntax highlights.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-all">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <Terminal size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Live WebSocket Terminal</h4>
                <p className="text-[11px] text-slate-500 mt-1">Real-time compilation and bidirectional stdin inputs.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-all">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Secure Sandbox</h4>
                <p className="text-[11px] text-slate-500 mt-1">Limited execution limits (CPU, Memory containment).</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-all">
              <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400">
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">AI Explain & Auto-Fix</h4>
                <p className="text-[11px] text-slate-500 mt-1">Plain English error diagnostics and code patches.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login / Forgot Password Card Panel (Right side) */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-16 lg:p-24 z-10">
        <div className="glass-card rounded-3xl w-full max-w-md p-8 md:p-10 relative overflow-hidden shadow-2xl border-white/10">
          
          {/* Top Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              {formMode === 'login' && 'Sign In Workspace'}
              {formMode === 'signup' && 'Create Sandbox Account'}
              {formMode === 'forgot' && (
                <>
                  <KeyRound size={22} className="text-purple-400" />
                  <span>Forgot Password</span>
                </>
              )}
            </h2>
            <p className="text-slate-500 text-xs mt-2">
              {formMode === 'login' && 'Enter credentials to load your IDE configurations'}
              {formMode === 'signup' && 'Register to spin up algorithm containers'}
              {formMode === 'forgot' && resetStep === 1 && 'Step 1: Enter your registered email address'}
              {formMode === 'forgot' && resetStep === 2 && 'Step 2: Enter the verification OTP code'}
              {formMode === 'forgot' && resetStep === 3 && 'Step 3: Create your new workspace password'}
              {formMode === 'forgot' && resetStep === 4 && 'Step 4: Password updated successfully'}
            </p>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="glass-panel p-3.5 rounded-xl border-red-500/25 bg-red-500/5 text-red-300 text-xs flex items-center gap-2.5 mb-6">
              <AlertCircle className="shrink-0 text-red-400" size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="glass-panel p-3.5 rounded-xl border-emerald-500/25 bg-emerald-500/5 text-emerald-300 text-xs flex items-center gap-2.5 mb-6">
              <Shield className="shrink-0 text-emerald-400" size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Dev Mode OTP Banner */}
          {formMode === 'forgot' && devOtpHint && resetStep === 2 && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-between mb-6">
              <span>Dev Testing OTP Code:</span>
              <span className="font-mono font-bold text-sm text-pink-300 bg-black/40 px-2.5 py-1 rounded-lg border border-pink-500/30 tracking-widest">{devOtpHint}</span>
            </div>
          )}

          {/* FORM TYPE 1: LOGIN or SIGNUP */}
          {(formMode === 'login' || formMode === 'signup') && (
            <form onSubmit={handleLoginOrSignupSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Username or Email</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. devnova"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input rounded-xl px-4 py-3 text-xs"
                />
              </div>

              {formMode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. user@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input rounded-xl px-4 py-3 text-xs"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input rounded-xl px-4 py-3 text-xs"
                />
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-4 py-3.5 text-xs font-bold rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40"
              >
                {formMode === 'login' ? (
                  <>
                    <LogIn size={15} /> Open IDE Workspace
                  </>
                ) : (
                  <>
                    <UserPlus size={15} /> Initialize Account
                  </>
                )}
              </GlassButton>

              {formMode === 'login' && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode('forgot');
                      setResetStep(1);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      if (username.includes('@')) {
                        setEmail(username);
                      }
                    }}
                    className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition-colors focus:outline-none cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </form>
          )}

          {/* FORM TYPE 2: FORGOT PASSWORD MULTI-STEP FLOW */}
          {formMode === 'forgot' && (
            <div>
              {/* STEP 1: Enter Email */}
              {resetStep === 1 && (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Registered Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="user@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-input rounded-xl pl-10 pr-4 py-3 text-xs w-full"
                      />
                    </div>
                  </div>

                  <GlassButton
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="w-full mt-4 py-3.5 text-xs font-bold rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40"
                  >
                    <Mail size={15} /> Send Reset Link / OTP
                  </GlassButton>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="mt-3 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back to Sign In
                  </button>
                </form>
              )}

              {/* STEP 2: Verify OTP */}
              {resetStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">6-Digit Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="glass-input rounded-xl px-4 py-3 text-sm text-center font-mono tracking-widest"
                    />
                  </div>

                  <GlassButton
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="w-full mt-4 py-3.5 text-xs font-bold rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40"
                  >
                    <Shield size={15} /> Verify Link or OTP
                  </GlassButton>

                  <div className="flex justify-between items-center mt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={13} /> Change Email
                    </button>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Enter New Password & Confirm Password */}
              {resetStep === 3 && (
                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="glass-input rounded-xl pl-10 pr-4 py-3 text-xs w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Confirm Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="glass-input rounded-xl pl-10 pr-4 py-3 text-xs w-full"
                      />
                    </div>
                  </div>

                  <GlassButton
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="w-full mt-4 py-3.5 text-xs font-bold rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40"
                  >
                    <KeyRound size={15} /> Update Password
                  </GlassButton>
                </form>
              )}

              {/* STEP 4: Password Updated Success */}
              {resetStep === 4 && (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 animate-bounce">
                    <CheckCircle2 size={36} />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">Password Updated!</h3>
                  <p className="text-slate-400 text-xs mb-8 max-w-xs leading-relaxed">
                    Your account password has been updated successfully. You can now log in with your new password.
                  </p>

                  <GlassButton
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full py-3.5 text-xs font-bold rounded-xl bg-purple-600/40 hover:bg-purple-600/60 border border-purple-500/40"
                  >
                    <LogIn size={15} /> Login with New Password
                  </GlassButton>
                </div>
              )}
            </div>
          )}

          {/* Toggle link (Only for Login and Signup) */}
          {formMode !== 'forgot' && (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setFormMode(formMode === 'login' ? 'signup' : 'login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-purple-300 hover:text-purple-200 transition-colors focus:outline-none cursor-pointer"
              >
                {formMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

