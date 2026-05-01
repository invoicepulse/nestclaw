import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendCode = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep('otp');
  };

  const verify = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Sign In</h1>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {step === 'email' ? (
          <>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none" />
            <button onClick={sendCode} disabled={loading || !email}
              className="w-full rounded-lg bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-400">Code sent to {email}</p>
            <input type="text" placeholder="Enter code" value={otp} onChange={(e) => setOtp(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none" />
            <button onClick={verify} disabled={loading || !otp}
              className="w-full rounded-lg bg-brand-600 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
