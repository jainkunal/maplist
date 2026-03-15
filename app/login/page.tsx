import Link from 'next/link';
import { Map } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden bg-background-dark text-slate-100 font-display">
      {/* Background decorative elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDpdD8_NhgfA63fQZWj1dv7osUCK1GTfdATTe3pCCYeuZMUE3IqW9_wqjDPnyemFtTQzAfy78UKEW9ea5tYZ_iYjSFsXkjWNVJwmSO_EGvxvQ1bn9ab8VOiKDFeAAz63U_-EwWQyMvxU9iwxyLPX-73EXX3Kowjhw7p8SwMuW_2F9QCVxCs2tuY6Ldi7Q5Apt6qDutbb3TKYu79-p2KKsysg75p6wjKC1GjdcjCqKaxIcnJ2VPpYcNeMFGWTDJ0awcisFQgJNM4l8E5')`,
          }}
        />
      </div>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-6 shadow-lg shadow-primary/20">
            <Map className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-white mb-3">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-lg">Your next journey begins here.</p>
        </div>

        {/* Glass Card */}
        <div className="glass-card p-8 rounded-xl shadow-2xl">
          <form className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-2 text-slate-300"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="w-full bg-white/5 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-primary hover:underline">
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-primary/25 mt-2"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#192233] px-3 text-slate-500 font-semibold tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-slate-700 hover:bg-white/5 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="currentColor"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="currentColor"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="currentColor"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-sm font-semibold">Google</span>
            </button>

            <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-slate-700 hover:bg-white/5 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M17.05 20.28c-.96.95-2.14 2.12-3.72 2.12-1.54 0-2.14-1-3.66-1-1.56 0-2.15 1-3.69 1-1.58 0-2.76-1.17-3.72-2.12-1.97-1.96-3.48-5.54-3.48-8.8 0-3.3 2.13-5.06 4.14-5.06 1.03 0 2 .54 2.63.54.62 0 1.63-.54 2.66-.54 1.76 0 3.36.93 4.14 2.22-3.42 1.43-2.86 6.33.63 7.82-.41 1.06-1.01 2.32-1.43 2.82zM12.03 5.48c-.06-2.33 1.88-4.33 4.13-4.48.24 2.53-2.3 4.67-4.13 4.48z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-sm font-semibold">Apple</span>
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="#" className="text-primary font-bold hover:underline">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
