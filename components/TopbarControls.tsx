'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Diet } from '@/lib/types'

const DIET_LABELS: Record<Diet, string> = {
  omnivore: 'Omnivore',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  keto: 'Keto',
  mediterranean: 'Mediterranean',
  'gluten-free': 'Gluten-Free'
}

interface Props {
  initialDiet: Diet
  initialServings: number
}

export function TopbarControls({ initialDiet, initialServings }: Props) {
  const router = useRouter()
  const [diet, setDiet] = useState<Diet>(initialDiet)
  const [servings, setServings] = useState(initialServings)

  const updateProfile = async (patch: Partial<{ diet: Diet; servings: number }>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update(patch).eq('id', user.id)
    router.refresh()
  }

  return (
    <div className="controls">
      <div>
        <label className="field-label">Diet</label>
        <select
          className="select"
          value={diet}
          onChange={e => {
            const d = e.target.value as Diet
            setDiet(d)
            updateProfile({ diet: d })
          }}
        >
          {Object.entries(DIET_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Servings</label>
        <select
          className="select"
          value={servings}
          onChange={e => {
            const n = Number(e.target.value)
            setServings(n)
            updateProfile({ servings: n })
          }}
        >
          {[1, 2, 3, 4, 5, 6].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
