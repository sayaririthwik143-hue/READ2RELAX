/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BarChart2, 
  Wind, 
  User as UserIcon, 
  Plus, 
  Lock, 
  Clock, 
  ShieldCheck,
  Camera,
  Bell,
  Smartphone,
  LogOut,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  UserCircle2,
  Users2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ExerciseDetector } from './components/ExerciseDetector';
import { MOCK_APPS, QUOTES, type User, cn } from './utils';

// Mock Auth and DB using LocalStorage
const MOCK_USER_KEY = 'read2relax_user';
const MOCK_AUTH_KEY = 'read2relax_auth';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = "You don't have permission to perform this action. Please check your account settings.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-zinc-50">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 mb-2">Application Error</h2>
          <p className="text-zinc-500 mb-6 font-medium">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Screen = 'splash' | 'auth' | 'permissions' | 'gender-selection' | 'app-selection' | 'home' | 'stats' | 'relax' | 'profile' | 'blocking';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExercise, setShowExercise] = useState<'pushups' | 'situps' | null>(null);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [gender, setGender] = useState<'man' | 'woman' | null>(null);
  const [limit, setLimit] = useState(30);
  const [isBlocked, setIsBlocked] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth Listener
  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem(MOCK_AUTH_KEY);
      setIsAuthReady(true);
      if (authData) {
        const parsedAuth = JSON.parse(authData);
        syncUserData(parsedAuth.uid);
      } else {
        setUser(null);
        if (currentScreen !== 'splash' && currentScreen !== 'permissions' && currentScreen !== 'gender-selection' && currentScreen !== 'app-selection') {
          setCurrentScreen('auth');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Splash Screen Delay
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        if (isAuthReady) {
          const authData = localStorage.getItem(MOCK_AUTH_KEY);
          if (authData) {
            if (user) {
              setCurrentScreen('home');
            }
          } else {
            setCurrentScreen('auth');
          }
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthReady, currentScreen, user]);

  // Sync User Data with LocalStorage
  const syncUserData = (uid: string) => {
    const userData = localStorage.getItem(MOCK_USER_KEY);
    if (userData) {
      const data = JSON.parse(userData) as User;
      setUser(data);
      try {
        setSelectedApps(JSON.parse(data.selected_apps));
      } catch (e) {
        setSelectedApps([]);
      }
      setLimit(data.screen_time_limit);
      
      if (['splash', 'auth', 'permissions', 'gender-selection', 'app-selection'].includes(currentScreen)) {
        setCurrentScreen('home');
      }
    } else {
      if (currentScreen === 'splash' || currentScreen === 'auth') {
        setCurrentScreen('permissions');
      }
    }
  };

  // Automatic Blocking
  useEffect(() => {
    if (user && user.daily_usage >= user.screen_time_limit && user.daily_usage > 0) {
      setIsBlocked(true);
    }
  }, [user?.daily_usage, user?.screen_time_limit]);

  const handleMockLogin = async (email: string, password: string) => {
    if (email && password) {
      const uid = 'mock-uid-123';
      localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify({ uid, email }));
      syncUserData(uid);
    } else {
      alert("Please enter email and password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(MOCK_AUTH_KEY);
    setUser(null);
    setCurrentScreen('auth');
  };

  const handleOnboardingContinue = () => {
    if (!gender) {
      alert("Please select your gender.");
      return;
    }
    setCurrentScreen('app-selection');
  };

  const finalizeOnboarding = async () => {
    const authData = localStorage.getItem(MOCK_AUTH_KEY);
    if (!authData) {
      setCurrentScreen('auth');
      return;
    }
    const { uid, email } = JSON.parse(authData);
    
    const newUser: User = {
      id: Date.now(),
      uid,
      name: email.split('@')[0],
      email: email,
      profile_photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      gender: gender as 'man' | 'woman',
      screen_time_limit: limit,
      daily_usage: 0,
      exercise_minutes_earned: 0,
      focus_score: 100,
      selected_apps: JSON.stringify(selectedApps)
    };

    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
    setCurrentScreen('home');
  };

  const updateUserData = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Exercise Completion
  const onExerciseComplete = (minutes: number) => {
    if (user) {
      updateUserData({
        exercise_minutes_earned: user.exercise_minutes_earned + minutes,
        screen_time_limit: user.screen_time_limit + minutes,
        daily_usage: Math.max(0, user.daily_usage - minutes)
      });
    }
    setShowExercise(null);
    setIsBlocked(false);
  };

  // Render Screens
  if (currentScreen === 'splash') {
    return (
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200 mb-6">
            <Smartphone className="text-white w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">Read2Relax</h1>
          <p className="text-zinc-500 font-medium italic">“Focus on Life, Not Just the Screen.”</p>
        </motion.div>
        <div className="absolute bottom-12">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                className="w-2 h-2 bg-blue-600 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === 'permissions') {
    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraGranted(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        alert("Camera access denied. Please allow it in your browser settings.");
      }
    };

    const handleContinue = () => {
      if (!cameraGranted) {
        alert("Camera access is MANDATORY for this app to detect exercises and unlock time. Please tap the Camera Access card above to grant permission.");
        return;
      }
      setCurrentScreen('gender-selection');
    };

    return (
      <div className="h-screen bg-zinc-50 p-6 flex flex-col">
        <div className="flex-1 pt-12">
          <h2 className="text-3xl font-black text-zinc-900 mb-2">Setup Permissions</h2>
          <p className="text-zinc-500 mb-8 font-medium">We need these to help you stay focused.</p>
          
          <div className="space-y-4">
            <PermissionCard 
              icon={<Smartphone className="text-blue-600" />}
              title="Usage Access"
              desc="Track app usage time."
              granted
            />
            <PermissionCard 
              icon={<ShieldCheck className="text-green-600" />}
              title="Display Over Apps"
              desc="Block apps when limit is reached."
              granted
            />
            <PermissionCard 
              icon={<Camera className="text-purple-600" />}
              title="Camera Access"
              desc="Tap to grant camera access for exercise detection."
              granted={cameraGranted}
              onClick={requestCamera}
            />
            <PermissionCard 
              icon={<Bell className="text-orange-600" />}
              title="Notifications"
              desc="Reminders and warnings."
              granted
            />
            <PermissionCard 
              icon={<Lock className="text-red-600" />}
              title="Device Admin"
              desc="Required to block apps effectively."
              granted
            />
          </div>
        </div>
        <button 
          onClick={handleContinue}
          className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl"
        >
          {cameraGranted ? "Continue" : "Grant Permissions & Continue"}
        </button>
      </div>
    );
  }

  if (currentScreen === 'gender-selection') {
    return (
      <div className="h-screen bg-white p-6 flex flex-col">
        <div className="flex-1 pt-12">
          <h2 className="text-3xl font-black text-zinc-900 mb-2">Your Gender</h2>
          <p className="text-zinc-500 mb-8 font-medium">We suggest exercises based on your gender.</p>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setGender('man')}
              className={cn(
                "p-6 rounded-3xl border-2 transition-all flex items-center gap-6",
                gender === 'man' ? "border-blue-600 bg-blue-50" : "border-zinc-100 bg-zinc-50"
              )}
            >
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", gender === 'man' ? "bg-blue-600 text-white" : "bg-white text-zinc-400 shadow-sm")}>
                <UserCircle2 size={32} />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-black text-zinc-900">Man</h4>
                <p className="text-zinc-500 font-medium text-sm">Suggested: Push-ups</p>
              </div>
            </button>

            <button
              onClick={() => setGender('woman')}
              className={cn(
                "p-6 rounded-3xl border-2 transition-all flex items-center gap-6",
                gender === 'woman' ? "border-blue-600 bg-blue-50" : "border-zinc-100 bg-zinc-50"
              )}
            >
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", gender === 'woman' ? "bg-blue-600 text-white" : "bg-white text-zinc-400 shadow-sm")}>
                <Users2 size={32} />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-black text-zinc-900">Woman</h4>
                <p className="text-zinc-500 font-medium text-sm">Suggested: Sit-ups</p>
              </div>
            </button>
          </div>
        </div>
        <button 
          onClick={handleOnboardingContinue}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl"
        >
          Continue
        </button>
      </div>
    );
  }

  if (currentScreen === 'app-selection') {
    return (
      <div className="h-screen bg-white p-6 flex flex-col">
        <div className="flex-1 overflow-y-auto pt-12">
          <h2 className="text-3xl font-black text-zinc-900 mb-2">Select Apps</h2>
          <p className="text-zinc-500 mb-8 font-medium">Choose apps you want to control.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            {MOCK_APPS.map(app => (
              <button
                key={app.id}
                onClick={() => {
                  setSelectedApps(prev => 
                    prev.includes(app.id) ? prev.filter(id => id !== app.id) : [...prev, app.id]
                  );
                }}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                  selectedApps.includes(app.id) ? "border-blue-600 bg-blue-50" : "border-zinc-100 bg-zinc-50"
                )}
              >
                <img src={app.icon} alt={app.name} className="w-12 h-12 rounded-xl" referrerPolicy="no-referrer" />
                <span className="font-bold text-sm text-zinc-900">{app.name}</span>
              </button>
            ))}
          </div>

          <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-zinc-900">Daily Limit</span>
              <span className="text-blue-600 font-black text-xl">{limit}m</span>
            </div>
            <input 
              type="range" 
              min="15" 
              max="30" 
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between mt-2 text-xs font-bold text-zinc-400">
              <span>15m</span>
              <span>30m</span>
            </div>
          </div>
        </div>
          <button 
          onClick={finalizeOnboarding}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl mt-6"
        >
          {localStorage.getItem(MOCK_AUTH_KEY) ? "Complete Setup" : "Continue to Login"}
        </button>
      </div>
    );
  }

  if (currentScreen === 'auth') {
    return (
      <AuthScreen 
        onEmailLogin={handleMockLogin}
      />
    );
  }

    return (
      <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      {/* Exercise Modal */}
      {showExercise && (
        <ExerciseDetector 
          type={showExercise} 
          onComplete={onExerciseComplete} 
          onClose={() => setShowExercise(null)} 
        />
      )}

      {/* Blocking Overlay */}
      <AnimatePresence>
        {isBlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-40 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <Lock className="text-red-600 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 mb-4">Time's Up!</h2>
            <p className="text-zinc-500 mb-12 font-medium leading-relaxed">
              Your screen time is finished. Complete an activity to unlock more minutes.
            </p>
            <div className="w-full space-y-4">
              <button 
                onClick={() => setShowExercise('pushups')}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all",
                  user?.gender === 'man' ? "bg-blue-600 text-white scale-105" : "bg-zinc-900 text-white"
                )}
              >
                <Flame size={20} />
                Do Push-ups {user?.gender === 'man' && "(Recommended)"}
              </button>
              
              <button 
                onClick={() => setShowExercise('situps')}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all",
                  user?.gender === 'woman' ? "bg-blue-600 text-white scale-105" : "bg-zinc-900 text-white"
                )}
              >
                <Smartphone size={20} />
                Do Sit-ups {user?.gender === 'woman' && "(Recommended)"}
              </button>

              {user && user.daily_usage < user.screen_time_limit && (
                <button 
                  onClick={() => setIsBlocked(false)}
                  className="w-full bg-white border-2 border-zinc-200 text-zinc-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  Go Back
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {currentScreen === 'home' && <HomeScreen user={user} onIncrease={() => setIsBlocked(true)} />}
        {currentScreen === 'stats' && <StatsScreen user={user} />}
        {currentScreen === 'relax' && <RelaxScreen />}
        {currentScreen === 'profile' && <ProfileScreen user={user} onUpdate={updateUserData} onLogout={handleLogout} />}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-zinc-100 px-8 py-4 flex justify-between items-center z-30">
        <NavButton active={currentScreen === 'home'} icon={<LayoutDashboard />} onClick={() => setCurrentScreen('home')} />
        <NavButton active={currentScreen === 'stats'} icon={<BarChart2 />} onClick={() => setCurrentScreen('stats')} />
        <NavButton active={currentScreen === 'relax'} icon={<Wind />} onClick={() => setCurrentScreen('relax')} />
        <NavButton active={currentScreen === 'profile'} icon={<UserIcon />} onClick={() => setCurrentScreen('profile')} />
      </nav>
    </div>
  );
}

// Sub-components

function AuthScreen({ 
  onEmailLogin
}: { 
  onEmailLogin: (e: string, p: string) => void
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-screen bg-white p-8 flex flex-col justify-center">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-100 mb-6 mx-auto">
          <Smartphone className="text-white w-10 h-10" />
        </div>
        <h2 className="text-4xl font-black text-zinc-900 mb-2">Welcome Back</h2>
        <p className="text-zinc-500 font-medium">Join the Read2Relax community.</p>
      </div>

      <div className="space-y-4">
        <input 
          type="email" 
          placeholder="Email Address" 
          className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button 
          onClick={() => onEmailLogin(email, password)}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 mt-4"
        >
          Login
        </button>
      </div>
    </div>
  );
}

function HomeScreen({ user, onIncrease }: { user: User | null, onIncrease: () => void }) {
  if (!user) return null;
  const remaining = Math.max(0, user.screen_time_limit - user.daily_usage);
  const progress = (user.daily_usage / user.screen_time_limit) * 100;

  const quote = React.useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);
  
  const selectedAppIds = React.useMemo(() => {
    try {
      return JSON.parse(user.selected_apps || '[]');
    } catch (e) {
      return [];
    }
  }, [user.selected_apps]);

  return (
    <div id="home-screen" className="p-6 pt-12 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">Hello, {user.name.split(' ')[0]}!</h2>
          <p className="text-zinc-500 font-medium">Ready for a focused day?</p>
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
          <Smartphone size={24} />
        </div>
      </header>

      <div 
        id="remaining-time-card" 
        className={cn(
          "p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden transition-colors duration-700",
          progress > 90 ? "bg-red-600 shadow-red-200" : 
          progress > 70 ? "bg-orange-500 shadow-orange-200" : 
          "bg-blue-600 shadow-blue-200"
        )}
      >
        <div className="relative z-10">
          <p className="text-white/80 font-bold uppercase tracking-wider text-xs mb-2">Remaining Time</p>
          <h3 className="text-5xl font-black mb-6 flex items-baseline gap-2">
            {remaining}
            <span className="text-xl font-bold opacity-60">m</span>
          </h3>
          <div className="w-full h-4 bg-black/10 rounded-full overflow-hidden mb-4 p-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ 
                width: `${Math.min(100, progress)}%`,
                backgroundColor: progress > 90 ? "#fff" : progress > 70 ? "#fff" : "#fff"
              }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              className={cn(
                "h-full rounded-full relative",
                progress > 90 && "animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              )}
              style={{ backgroundColor: 'white' }}
            >
              {progress > 15 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </motion.div>
          </div>
          <div className="flex justify-between text-xs font-bold text-white/80">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {user.daily_usage}m used
            </span>
            <span>{user.screen_time_limit}m limit</span>
          </div>
        </div>
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -right-12 -bottom-12 w-48 h-48 bg-white rounded-full blur-3xl" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Focus Score" value={`${user.focus_score}/100`} icon={<Flame className="text-orange-500" />} />
        <StatCard title="Saved Today" value={`${Math.max(0, 60 - user.daily_usage)}m`} icon={<Clock className="text-green-500" />} />
      </div>

      <div className="bg-white p-6 rounded-3xl border border-zinc-100">
        <h4 className="font-black text-zinc-900 mb-4">Controlled Apps</h4>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {MOCK_APPS.filter(a => selectedAppIds.includes(a.id)).map(app => (
            <a 
              key={app.id} 
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 min-w-[64px] hover:opacity-80 transition-opacity"
            >
              <img src={app.icon} className="w-12 h-12 rounded-xl shadow-sm" alt={app.name} referrerPolicy="no-referrer" />
              <span className="text-[10px] font-bold text-zinc-500">{app.name}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-3xl text-white flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-xs font-bold mb-1">Daily Quote</p>
          <p className="font-medium italic text-sm leading-relaxed">"{quote}"</p>
        </div>
      </div>

      <button 
        id="increase-watch-time-btn"
        onClick={onIncrease}
        className="w-full bg-white border-2 border-blue-600 text-blue-600 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2"
      >
        <Plus size={24} />
        INCREASE WATCH TIME
      </button>
    </div>
  );
}

function StatsScreen({ user }: { user: User | null }) {
  if (!user) return null;
  
  const data = [
    { name: 'Mon', time: 45 },
    { name: 'Tue', time: 52 },
    { name: 'Wed', time: 38 },
    { name: 'Thu', time: 65 },
    { name: 'Fri', time: 48 },
    { name: 'Sat', time: 80 },
    { name: 'Sun', time: 55 },
  ];

  return (
    <div className="p-6 pt-12 space-y-6">
      <h2 className="text-3xl font-black text-zinc-900">Statistics</h2>
      
      <div className="bg-white p-6 rounded-3xl border border-zinc-100 h-64 w-full">
        <h4 className="font-bold text-zinc-900 mb-4">Weekly Usage (min)</h4>
        <ResponsiveContainer width="100%" height="100%" key="stats-chart">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#999' }} />
            <Tooltip cursor={{ fill: '#f8f8f8' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Bar dataKey="time" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-zinc-900">Most Used Apps</h4>
        <div className="bg-white rounded-3xl border border-zinc-100 divide-y divide-zinc-50">
          <AppUsageRow name="YouTube" time="42m" color="bg-red-500" />
          <AppUsageRow name="Instagram" time="28m" color="bg-pink-500" />
          <AppUsageRow name="Free Fire" time="15m" color="bg-orange-500" />
        </div>
      </div>
    </div>
  );
}

function RelaxScreen() {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Exhale'>('Inhale');

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setPhase(prev => prev === 'Inhale' ? 'Exhale' : 'Inhale');
      }, 5000);
    } else {
      setPhase('Inhale');
    }
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="p-6 pt-12 space-y-6">
      <h2 className="text-3xl font-black text-zinc-900">Mind Relaxation</h2>
      
      <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex flex-col items-center text-center">
        <div className="w-48 h-48 bg-emerald-200/30 rounded-full flex items-center justify-center mb-6 relative">
          <AnimatePresence mode="wait">
            {isActive && (
              <motion.div 
                key={phase}
                initial={{ scale: phase === 'Inhale' ? 0.5 : 1.2, opacity: 0.3 }}
                animate={{ scale: phase === 'Inhale' ? 1.2 : 0.5, opacity: 0.6 }}
                transition={{ duration: 5, ease: "easeInOut" }}
                className="absolute inset-0 bg-emerald-400 rounded-full"
              />
            )}
          </AnimatePresence>
          <div className="relative z-10 flex flex-col items-center">
            <Wind className="text-emerald-600 w-12 h-12 mb-2" />
            {isActive && (
              <motion.p 
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-emerald-900 font-black text-xl uppercase tracking-widest"
              >
                {phase}
              </motion.p>
            )}
          </div>
        </div>
        <h3 className="text-2xl font-black text-emerald-900 mb-2">Breathing Exercise</h3>
        <p className="text-emerald-700 font-medium mb-8">
          {isActive ? "Follow the circle's rhythm." : "Inhale for 5s, Exhale for 5s."}
        </p>
        <button 
          onClick={() => setIsActive(!isActive)}
          className={cn(
            "px-8 py-4 rounded-2xl font-bold transition-all shadow-lg",
            isActive ? "bg-white text-emerald-600 border-2 border-emerald-600" : "bg-emerald-600 text-white"
          )}
        >
          {isActive ? "Stop Session" : "Start Session"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <TipCard title="Digital Detox" desc="Try keeping your phone in another room while studying." />
        <TipCard title="Eye Health" desc="Follow the 20-20-20 rule: Every 20 mins, look 20 feet away for 20s." />
      </div>
    </div>
  );
}

function ProfileScreen({ user, onLogout, onUpdate }: { user: User | null, onLogout: () => void, onUpdate: (updates: Partial<User>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [photo, setPhoto] = useState(user?.profile_photo || '');

  if (!user) return null;

  const handleSave = () => {
    onUpdate({ name, profile_photo: photo });
    setIsEditing(false);
  };

  return (
    <div className="p-6 pt-12 space-y-8">
      <div className="flex flex-col items-center">
        <div className="relative group">
          <div className="w-24 h-24 bg-zinc-200 rounded-[2rem] mb-4 flex items-center justify-center text-zinc-400 overflow-hidden border-4 border-white shadow-lg">
            {photo ? <img src={photo} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon size={40} />}
          </div>
          {isEditing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[2rem] mb-4">
              <Camera size={24} className="text-white" />
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="w-full space-y-4 px-4">
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full p-3 bg-white border border-zinc-200 rounded-xl font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input 
              type="text" 
              value={photo} 
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="Profile Photo URL"
              className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold">Save</button>
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-zinc-200 text-zinc-600 py-2 rounded-xl font-bold">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-zinc-900">{user.name}</h2>
            <p className="text-zinc-500 font-medium">{user.email}</p>
            <div className="mt-2 px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {user.gender || 'Not Specified'}
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              className="mt-2 text-blue-600 font-bold text-sm"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 text-center">
          <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Focus Streak</p>
          <p className="text-2xl font-black text-orange-500">12 Days</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 text-center">
          <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Earned Mins</p>
          <p className="text-2xl font-black text-blue-600">{user.exercise_minutes_earned}m</p>
        </div>
      </div>

      <div className="space-y-2">
        <ProfileLink icon={<ShieldCheck size={20} />} label="Privacy Settings" onClick={() => alert('Privacy Settings coming soon!')} />
        <ProfileLink icon={<Smartphone size={20} />} label="App Limits" onClick={() => alert('App Limits configuration coming soon!')} />
        <ProfileLink icon={<Bell size={20} />} label="Notifications" onClick={() => alert('Notification settings coming soon!')} />
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-4 text-red-600 font-bold hover:bg-red-50 rounded-2xl transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>

      <footer className="pt-12 pb-8 text-center space-y-4">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent mb-6" />
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
          Founder & Made By
        </p>
        <div className="relative inline-block">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tighter italic">
            SAYARI RITHWIK
          </h2>
          <div className="absolute -bottom-1 left-0 w-full h-1 bg-blue-600 rounded-full opacity-20" />
        </div>
        <p className="text-zinc-300 text-[8px] font-bold uppercase tracking-widest pt-4">
          © 2026 Read2Relax • All Rights Reserved
        </p>
      </footer>
    </div>
  );
}

// Helpers

function NavButton({ active, icon, onClick }: { active: boolean, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl transition-all",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-zinc-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 24 })}
    </button>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-100 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase">{title}</p>
        <p className="text-lg font-black text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function PermissionCard({ icon, title, desc, granted, onClick }: { icon: React.ReactNode, title: string, desc: string, granted: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-4 rounded-2xl border border-zinc-100 flex items-center gap-4",
        onClick && "cursor-pointer hover:bg-zinc-50 transition-colors active:scale-95"
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-zinc-900 text-sm">{title}</h4>
        <p className="text-zinc-500 text-xs font-medium">{desc}</p>
      </div>
      {granted && <CheckCircle2 className="text-green-500" size={20} />}
    </div>
  );
}

function AppUsageRow({ name, time, color }: { name: string, time: string, color: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full", color)} />
        <span className="font-bold text-zinc-900">{name}</span>
      </div>
      <span className="text-zinc-500 font-bold">{time}</span>
    </div>
  );
}

function TipCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-100">
      <h4 className="font-bold text-zinc-900 mb-1">{title}</h4>
      <p className="text-zinc-500 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function ProfileLink({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-100 hover:bg-zinc-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="text-zinc-400">{icon}</div>
        <span className="font-bold text-zinc-900">{label}</span>
      </div>
      <ChevronRight className="text-zinc-300" size={20} />
    </button>
  );
}
