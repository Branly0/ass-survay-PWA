import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSurveys, getBackupMeta, clearOwner } from '../db'
import { disconnectSocket } from '../socket'
import type { Survey, SurveyStatus } from '../types'
import { formatDistanceToNow } from 'date-fns'

type FilterTab = 'all' | SurveyStatus

export default function Dashboard() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<'success' | 'failed' | 'pending' | null>(null)

  useEffect(() => {
    async function load() {
      const [all, meta] = await Promise.all([getAllSurveys(), getBackupMeta()])
      setSurveys(all)
      if (meta) {
        setLastBackup(meta.lastBackupAt)
        setBackupStatus(meta.lastBackupStatus)
      }
    }
    load()
  }, [])

  async function handleLogout() {
    disconnectSocket()
    await clearOwner()
    window.location.reload()
  }

  function copyLink(surveyId: string) {
    const url = `${window.location.origin}/survey/${surveyId}`
    navigator.clipboard.writeText(url)
  }

  const filtered = filter === 'all' ? surveys : surveys.filter(s => s.status === filter)

  const totalResponses = 847 // will come from db later
  const activeCount = surveys.filter(s => s.status === 'active').length

  const statusColors: Record<SurveyStatus, string> = {
    active: 'bg-green-50 text-green-700',
    draft: 'bg-gray-100 text-gray-500',
    closed: 'bg-red-50 text-red-500',
  }

  const cardIcons: Record<string, string> = {
    active: '📋',
    draft: '📝',
    closed: '📊',
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h1 className="text-lg font-medium text-gray-900">
          Survey<span className="text-gray-400 font-normal">ly</span>
        </h1>
        <div className="flex items-center gap-3">
          {/* Backup status */}
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
            backupStatus === 'success'
              ? 'bg-green-50 text-green-700 border-green-100'
              : backupStatus === 'failed'
              ? 'bg-red-50 text-red-500 border-red-100'
              : 'bg-gray-50 text-gray-400 border-gray-100'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              backupStatus === 'success' ? 'bg-green-500'
              : backupStatus === 'failed' ? 'bg-red-500'
              : 'bg-gray-400'
            }`} />
            {backupStatus === 'success' && lastBackup
              ? `Backed up ${formatDistanceToNow(new Date(lastBackup), { addSuffix: true })}`
              : backupStatus === 'failed'
              ? 'Backup failed'
              : 'No backup yet'
            }
          </div>

          {/* New survey */}
          <button
            onClick={() => navigate('/builder')}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            New survey
          </button>

          {/* Avatar / logout */}
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors"
          >
            YO
          </button>
        </div>
      </div>

      <div className="px-6 py-6">

        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total surveys', value: surveys.length, sub: `${activeCount} active` },
            { label: 'Total responses', value: totalResponses, sub: '+34 this week' },
            { label: 'Avg. completion', value: '68%', sub: 'across active' },
            { label: 'Local storage', value: '2.1 GB', sub: 'of 5 GB used' },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{m.label}</div>
              <div className="text-2xl font-medium text-gray-900">{m.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-900">Your surveys</h2>
          <div className="flex gap-1">
            {(['all', 'active', 'draft', 'closed'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${
                  filter === tab
                    ? 'bg-white border border-gray-200 text-gray-900 font-medium shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Survey grid */}
        <div className="grid grid-cols-3 gap-3">

          {filtered.map(survey => (
            <div
              key={survey.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/results/${survey.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-lg">
                  {cardIcons[survey.status]}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[survey.status]}`}>
                  {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                </span>
              </div>

              <div className="text-sm font-medium text-gray-900 mb-1 leading-snug">
                {survey.title}
              </div>
              <div className="text-xs text-gray-400 leading-relaxed mb-4">
                {survey.description || 'No description'}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">
                  <span className="font-medium text-gray-900">—</span> responses
                </span>
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                  {/* Copy link */}
                  {survey.status !== 'draft' && (
                    <button
                      onClick={() => copyLink(survey.id)}
                      title="Copy link"
                      className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 9a3 3 0 0 0 4.5.3l2-2a3 3 0 0 0-4.2-4.2l-1.1 1.1"/>
                        <path d="M10 7a3 3 0 0 0-4.5-.3l-2 2a3 3 0 0 0 4.2 4.2l1.1-1.1"/>
                      </svg>
                    </button>
                  )}
                  {/* Edit */}
                  <button
                    onClick={() => navigate(`/builder/${survey.id}`)}
                    title="Edit"
                    className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M11 2.5a1.5 1.5 0 0 1 2.1 2.1L5 13H3v-2L11 2.5z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="col-span-3 py-16 text-center text-sm text-gray-400">
              No surveys found.{' '}
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="underline">
                  View all
                </button>
              )}
            </div>
          )}

          {/* New survey card */}
          {filter === 'all' && (
            <div
              onClick={() => navigate('/builder')}
              className="border border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 min-h-40 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-300 hover:text-gray-400"
            >
              <span className="text-2xl">+</span>
              <span className="text-xs">New survey</span>
            </div>
          )}
        </div>

        {/* Storage bar */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Local storage</span>
            <span>2.1 GB / 5 GB</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full">
            <div className="h-1 bg-gray-900 rounded-full w-[42%]" />
          </div>
          <div className="text-xs text-gray-300 mt-1.5">
            {lastBackup
              ? `Last backup: ${formatDistanceToNow(new Date(lastBackup), { addSuffix: true })} — all responses confirmed`
              : 'No backup performed yet'
            }
          </div>
        </div>

      </div>
    </div>
  )
}