import type { Session } from '@supabase/supabase-js'
import { LogIn, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { supabase } from '../services/supabaseClient'

interface AuthGateProps {
  children: (session: Session) => ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!supabase) {
    return <AuthMessage message="Supabase environment variables are missing." />
  }

  if (isLoading) {
    return <AuthMessage message="Loading account..." />
  }

  if (!session) {
    return <AuthForm />
  }

  return (
    <>
      <AccountBar email={session.user.email ?? 'Signed in'} />
      {children(session)}
    </>
  )
}

function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
            },
          })

    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'sign-up' && !result.data.session) {
      setMessage('Check your email to confirm your account.')
    }

    setIsSubmitting(false)
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">My Baking Recipe</p>
        <h1>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</h1>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {message && <p className="auth-message">{message}</p>}
        <button className="save-button" type="submit" disabled={isSubmitting}>
          <LogIn size={18} aria-hidden="true" />
          {isSubmitting
            ? 'Please wait...'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Create account'}
        </button>
        <button
          className="link-button"
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        >
          {mode === 'sign-in'
            ? 'Create a new account'
            : 'I already have an account'}
        </button>
      </form>
    </main>
  )
}

function AccountBar({ email }: { email: string }) {
  return (
    <div className="account-bar">
      <span>{email}</span>
      <button
        className="link-button"
        type="button"
        onClick={() => void supabase?.auth.signOut()}
      >
        <LogOut size={16} aria-hidden="true" />
        Sign out
      </button>
    </div>
  )
}

function AuthMessage({ message }: { message: string }) {
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <p>{message}</p>
      </div>
    </main>
  )
}
