"usetypescript"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGetEarlyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      
      localStorage.setItem('multiplier_user_email', email);
      localStorage.setItem('multiplier_session_active', 'true');
      
      
      router.push('/dashboard'); 
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
          Multiply Your Influence
        </h2>
        <p className="text-sm text-center text-slate-500 mb-6">
          Sign up to generate your Personal Brand Bible.
        </p>

        <form onSubmit={handleGetEarlyAccess} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-slate-950 text-white font-medium py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Opening Workspace...' : 'Get Early Access'}
          </button>

          {error && (
            <p className="text-xs text-center text-red-500 mt-2">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}