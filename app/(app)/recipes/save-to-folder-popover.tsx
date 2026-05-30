'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  addRecipeToFolder,
  removeRecipeFromFolder,
  createFolder,
  type Folder
} from '@/lib/db/folders'

interface Props {
  recipeId: string
  folders: Folder[]
  /** Folder ids the recipe is already in (controlled by parent) */
  selectedFolderIds: string[]
  /** Called on every successful change so the parent can update its membership state */
  onMembershipChange: (folderId: string, isMember: boolean) => void
  /** Called when the user creates a new folder so the parent can append it */
  onFolderCreated: (folder: Folder) => void
  /** Close the popover */
  onClose: () => void
}

export function SaveToFolderPopover({
  recipeId,
  folders,
  selectedFolderIds,
  onMembershipChange,
  onFolderCreated,
  onClose
}: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [, startTransition] = useTransition()

  const isInFolder = (folderId: string) => selectedFolderIds.includes(folderId)

  const toggle = (folderId: string) => {
    const currentlyIn = isInFolder(folderId)
    // Optimistic update via callback
    onMembershipChange(folderId, !currentlyIn)
    startTransition(async () => {
      const supabase = createClient()
      const ok = currentlyIn
        ? await removeRecipeFromFolder(supabase, folderId, recipeId)
        : await addRecipeToFolder(supabase, folderId, recipeId)
      if (!ok) {
        // Roll back the optimistic update
        onMembershipChange(folderId, currentlyIn)
      } else {
        router.refresh()
      }
    })
  }

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    startTransition(async () => {
      const supabase = createClient()
      // Get current user from supabase since we don't pass it down
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const folder = await createFolder(supabase, user.id, trimmed)
      if (!folder) {
        alert('Could not create the folder. The name may already be in use.')
        return
      }
      // Add to the new folder immediately
      await addRecipeToFolder(supabase, folder.id, recipeId)
      onFolderCreated(folder)
      onMembershipChange(folder.id, true)
      setNewName('')
      setAdding(false)
      router.refresh()
    })
  }

  return (
    <div className="folder-popover" onClick={e => e.stopPropagation()}>
      <div className="folder-popover-head">
        <div className="eyebrow">Save to folder</div>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          style={{ width: '28px', height: '28px', fontSize: '20px' }}
        >×</button>
      </div>

      {folders.length === 0 && !adding && (
        <div className="folder-popover-empty">
          No folders yet. Create one below.
        </div>
      )}

      {folders.length > 0 && (
        <ul className="folder-list">
          {folders.map(f => (
            <li key={f.id}>
              <label className="folder-list-item">
                <input
                  type="checkbox"
                  checked={isInFolder(f.id)}
                  onChange={() => toggle(f.id)}
                />
                <span className="folder-list-name">{f.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="folder-new-row">
          <input
            type="text"
            className="folder-new-input"
            placeholder="Folder name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreate}>
            Create
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setAdding(false); setNewName('') }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="folder-new-trigger"
          onClick={() => setAdding(true)}
        >
          + New folder
        </button>
      )}
    </div>
  )
}
