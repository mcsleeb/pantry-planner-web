'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { renameFolder, deleteFolder, type Folder } from '@/lib/db/folders'

interface Props {
  folders: Folder[]
  /** null = "All recipes", otherwise selected folder id */
  selectedFolderId: string | null
  onSelect: (folderId: string | null) => void
  onFoldersChanged: () => void
}

export function FolderFilterDropdown({
  folders,
  selectedFolderId,
  onSelect,
  onFoldersChanged
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [, startTransition] = useTransition()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected = folders.find(f => f.id === selectedFolderId)
  const buttonLabel = selected ? selected.name : 'All folders'

  const beginRename = (folder: Folder) => {
    setEditingId(folder.id)
    setEditingName(folder.name)
  }

  const commitRename = (folderId: string) => {
    const trimmed = editingName.trim()
    if (!trimmed) { setEditingId(null); return }
    startTransition(async () => {
      const supabase = createClient()
      const ok = await renameFolder(supabase, folderId, trimmed)
      if (ok) {
        onFoldersChanged()
        router.refresh()
      } else {
        alert('Could not rename folder. The name may already be in use.')
      }
      setEditingId(null)
    })
  }

  const handleDelete = (folder: Folder) => {
    const message = folder.recipeCount > 0
      ? `Delete "${folder.name}"? It contains ${folder.recipeCount} ${folder.recipeCount === 1 ? 'recipe' : 'recipes'}. The recipes themselves won't be deleted.`
      : `Delete "${folder.name}"?`
    if (!confirm(message)) return
    startTransition(async () => {
      const supabase = createClient()
      const ok = await deleteFolder(supabase, folder.id)
      if (ok) {
        if (selectedFolderId === folder.id) onSelect(null)
        onFoldersChanged()
        router.refresh()
      }
    })
  }

  return (
    <div className="folder-dropdown-wrap" ref={wrapperRef}>
      <button
        className={`diet-chip ${selectedFolderId ? 'on' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        📁 {buttonLabel} {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="folder-dropdown-panel">
          <button
            className={`folder-dropdown-item ${selectedFolderId === null ? 'on' : ''}`}
            onClick={() => { onSelect(null); setOpen(false) }}
          >
            <span className="folder-list-name">All recipes</span>
          </button>

          {folders.length === 0 ? (
            <div className="folder-popover-empty">
              No folders yet. Save a recipe to create one.
            </div>
          ) : (
            <ul className="folder-list folder-list-inline">
              {folders.map(f => (
                <li key={f.id} className="folder-dropdown-row">
                  {editingId === f.id ? (
                    <div className="folder-new-row" style={{ flex: 1 }}>
                      <input
                        type="text"
                        className="folder-new-input"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(f.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => commitRename(f.id)}
                      >Save</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingId(null)}
                      >Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button
                        className={`folder-dropdown-item ${selectedFolderId === f.id ? 'on' : ''}`}
                        onClick={() => { onSelect(f.id); setOpen(false) }}
                      >
                        <span className="folder-list-name">{f.name}</span>
                        <span className="folder-count">{f.recipeCount}</span>
                      </button>
                      <button
                        className="folder-row-action"
                        onClick={() => beginRename(f)}
                        aria-label={`Rename ${f.name}`}
                        title="Rename"
                      >✎</button>
                      <button
                        className="folder-row-action folder-row-action-danger"
                        onClick={() => handleDelete(f)}
                        aria-label={`Delete ${f.name}`}
                        title="Delete"
                      >×</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
