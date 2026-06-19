import { useMemo } from 'react'
import App from '../App'
import { SupabaseRecipeRepository } from '../repositories/supabaseRecipeRepository'
import { supabase } from '../services/supabaseClient'

export function CloudApp() {
  const repository = useMemo(() => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    return new SupabaseRecipeRepository(supabase)
  }, [])

  return <App repository={repository} />
}
