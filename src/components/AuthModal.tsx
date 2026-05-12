'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AuthModal() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  return (
    <div className="p-8 bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4 text-black text-center">Multiply Your Influence</h2>
      <p className="text-gray-600 mb-6 text-center">Sign up to generate your Personal Brand Bible.</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded-lg font-bold hover:bg-gray-800 transition"
        >
          {loading ? 'Sending...' : 'Get Early Access'}
        </button>
      </form>
      {message && <p className="mt-4 text-center text-sm font-medium text-blue-600">{message}</p>}
    </div>
  )
}