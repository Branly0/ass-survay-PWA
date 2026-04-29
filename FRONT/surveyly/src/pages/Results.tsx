import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getOwner, getSurvey } from '../db'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

interface ServerResponse {
  id: number
  age_group: string
  gender: string
  nationality: string
  answers: Record<string, string>[]
  created_at: string
}

interface ServerSurvey {
  id: number
  title: string
  description: string
  question: Record<string, string>[]
}

type FilterKey = 'all' | 'gender' | 'age_group' | 'nationality'

const LIMIT = 50

export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [serverSurvey, setServerSurvey] = useState<ServerSurvey | null>(null)
  const [allResponses, setAllResponses] = useState<ServerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const [filterKey, setFilterKey] = useState<FilterKey>('all')
  const [filterValue, setFilterValue] = useState('')

  // Selected response for detail view
  const [selected, setSelected] = useState<ServerResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Load survey from server
  useEffect(() => {
    if (!id) return
    async function loadSurvey() {
      const localSurvey = await getSurvey(id!)
      console.log('local survey:', localSurvey)
      if (!localSurvey?.serverId) {
        console.log('no serverId found')
        setLoading(false)
        return
      }
      const owner = await getOwner()
      try {
        const res = await fetch(`${SERVER_URL}/survey/${localSurvey.serverId}`, {
          headers: { Authorization: `Bearer ${owner?.token}` },
        })
        if (res.ok) setServerSurvey(await res.json())
      } catch (err) {
        console.error('Failed to fetch survey:', err)
      }
    }
    loadSurvey()
  }, [id])

  // Load responses on mount
  useEffect(() => {
    if (!id) return
    fetchResponses(0, true)
  }, [id])

  async function fetchResponses(currentOffset: number, fresh = false) {
    if (fresh) setLoading(true)
    else setLoadingMore(true)

    try {
      const localSurvey = await getSurvey(id!)
      if (!localSurvey?.serverId) {
        console.log('no serverId — cannot fetch responses')
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const owner = await getOwner()
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(currentOffset),
      })

      const res = await fetch(
        `${SERVER_URL}/filler/responses/${localSurvey.serverId}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${owner?.token}` } }
      )

      if (!res.ok) {
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const data: ServerResponse[] = await res.json()
      if (fresh) setAllResponses(data)
      else setAllResponses(prev => [...prev, ...data])

      setHasMore(data.length === LIMIT)
      setOffset(currentOffset + data.length)
    } catch (err) {
      console.error('Failed to fetch responses:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function handleRowClick(response: ServerResponse) {
    setLoadingDetail(true)
    try {
      const owner = await getOwner()
      const res = await fetch(`${SERVER_URL}/filler/${response.id}`, {
        headers: { Authorization: `Bearer ${owner?.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSelected(data)
      } else {
        setSelected(response) // fallback to what we already have
      }
    } catch {
      setSelected(response)
    } finally {
      setLoadingDetail(false)
    }
  }

  function handleFilterKey(key: FilterKey) {
    setFilterKey(key)
    setFilterValue('')
  }

  // Client-side filtering
  const filtered = allResponses.filter(r => {
    if (filterKey === 'all' || !filterValue) return true
    if (filterKey === 'gender') return r.gender === filterValue
    if (filterKey === 'age_group') return r.age_group === filterValue
    if (filterKey === 'nationality')
      return r.nationality?.toLowerCase().includes(filterValue.toLowerCase())
    return true
  })

  // Parse questions
  const questions: { index: string; label: string }[] =
    serverSurvey?.question.map(q => ({
      index: Object.keys(q)[0],
      label: Object.values(q)[0],
    })) ?? []

  function getAnswer(response: ServerResponse, index: string): string {
    for (const obj of response.answers) {
      if (obj[index] !== undefined) return obj[index]
    }
    return '—'
  }

  const uniqueNationalities = [...new Set(allResponses.map(r => r.nationality).filter(Boolean))]

  return (
    <div className="min-h-screen bg-white">

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            ← Back
          </button>
          <span className="text-gray-200">|</span>
          <h1 className="text-sm font-medium text-gray-900 truncate max-w-xs">
            {serverSurvey?.title ?? 'Results'}
          </h1>
        </div>
        <div className="text-xs text-gray-400">
          {filtered.length} / {allResponses.length} response{allResponses.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="px-6 py-6">

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 bg-gray-50 p-1 rounded-lg">
            {([
              { key: 'all', label: 'All' },
              { key: 'gender', label: 'Gender' },
              { key: 'age_group', label: 'Age group' },
              { key: 'nationality', label: 'Nationality' },
            ] as { key: FilterKey; label: string }[]).map(tab => (
              <button key={tab.key} onClick={() => handleFilterKey(tab.key)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  filterKey === tab.key
                    ? 'bg-white text-gray-900 font-medium shadow-sm border border-gray-100'
                    : 'text-gray-400 hover:text-gray-600'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {filterKey === 'gender' && (
            <select value={filterValue} onChange={e => setFilterValue(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-700">
              <option value="">All genders</option>
              {['male', 'female', 'other', 'prefer_not_to_say'].map(g => (
                <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}

          {filterKey === 'age_group' && (
            <select value={filterValue} onChange={e => setFilterValue(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-700">
              <option value="">All age groups</option>
              {['child', 'teenager', 'adult', 'senior'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}

          {filterKey === 'nationality' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input type="text" value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                placeholder="e.g. Cameroonian"
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-700 w-44"
              />
              {uniqueNationalities.slice(0, 5).map(n => (
                <button key={n} onClick={() => setFilterValue(filterValue === n ? '' : n)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterValue === n
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading responses...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm text-gray-400">No responses found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">#</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">Gender</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">Age group</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">Nationality</th>
                    {questions.map(q => (
                      <th key={q.index} className="text-left text-xs font-medium text-gray-400 px-4 py-3 min-w-48">
                        Q{q.index}: {q.label.length > 25 ? q.label.slice(0, 25) + '…' : q.label}
                      </th>
                    ))}
                    <th className="text-left text-xs font-medium text-gray-400 px-4 py-3 whitespace-nowrap">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={r.id}
                      onClick={() => handleRowClick(r)}
                      className={`border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}>
                      <td className="px-4 py-3 text-xs text-gray-300">{idx + 1}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize whitespace-nowrap">
                        {r.gender?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize whitespace-nowrap">
                        {r.age_group ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {r.nationality ?? '—'}
                      </td>
                      {questions.map(q => (
                        <td key={q.index} className="px-4 py-3 text-xs text-gray-700 max-w-xs">
                          <div className="line-clamp-2">{getAnswer(r, q.index)}</div>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button onClick={() => fetchResponses(offset)} disabled={loadingMore}
                  className="text-sm px-6 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  {loadingMore ? 'Loading...' : 'Load more responses'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Response detail modal */}
      {(selected || loadingDetail) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}>

            {loadingDetail ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
            ) : selected && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-900">Response #{selected.id}</h2>
                  <button onClick={() => setSelected(null)}
                    className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
                </div>

                <div className="px-6 py-4">
                  {/* Respondent info */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Gender', value: selected.gender?.replace(/_/g, ' ') },
                      { label: 'Age group', value: selected.age_group },
                      { label: 'Nationality', value: selected.nationality },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                        <div className="text-sm font-medium text-gray-900 capitalize">{item.value ?? '—'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Q&A */}
                  <div className="flex flex-col gap-4">
                    {questions.map(q => (
                      <div key={q.index}>
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          Q{q.index}: {q.label}
                        </div>
                        <div className="text-sm text-gray-900 bg-gray-50 rounded-lg px-4 py-3 leading-relaxed">
                          {getAnswer(selected, q.index)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-xs text-gray-300">
                    Submitted: {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}