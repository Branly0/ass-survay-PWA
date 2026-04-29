import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getOwner, getSurvey, saveSurvey, deleteSurvey } from '../db'
import type { Question, Survey, SurveyStatus } from '../types'
import { v4 as uuidv4 } from 'uuid'

export default function Builder() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [step, setStep] = useState<'meta' | 'questions'>('meta')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [status, setStatus] = useState<SurveyStatus>('draft')
  const [saving, setSaving] = useState(false)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')  // ← error state

  useEffect(() => {
    if (!id) return
    getSurvey(id).then(survey => {
      if (!survey) return
      setTitle(survey.title)
      setDescription(survey.description)
      setQuestions(survey.questions)
      setStatus(survey.status)
      setCreatedAt(survey.createdAt)
      setStep('questions')
    })
  }, [id])

  function addQuestion() {
    const newQ: Question = {
      id: uuidv4(),
      type: 'long_text',
      label: '',
      required: false,
    }
    setQuestions(prev => [...prev, newQ])
  }

  function updateQuestion(qId: string, label: string) {
    setQuestions(prev =>
      prev.map(q => (q.id === qId ? { ...q, label } : q))
    )
  }

  function toggleRequired(qId: string) {
    setQuestions(prev =>
      prev.map(q => (q.id === qId ? { ...q, required: !q.required } : q))
    )
  }

  function removeQuestion(qId: string) {
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  function moveQuestion(qId: string, direction: 'up' | 'down') {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === qId)
      if (idx === -1) return prev
      const next = [...prev]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  async function handleSave(overrideStatus?: SurveyStatus) {
    setSaving(true)
    setSaveError('')  // clear previous error
    const now = new Date().toISOString()
    const finalStatus = overrideStatus ?? status
    const surveyId = id ?? uuidv4()

    const survey: Survey = {
      id: surveyId,
      title: title.trim(),
      description: description.trim(),
      status: finalStatus,
      questions,
      createdAt: createdAt ?? now,
      updatedAt: now,
    }

    if (finalStatus === 'active') {
      try {
        const freshOwner = await getOwner()
        const token = freshOwner?.token

        const payload = {
          id: 0,
          title: survey.title,
          description: survey.description,
          question: questions.map((q, idx) => {
            const obj: Record<string, string> = {}
            obj[String(idx + 1)] = q.label
            return obj
          }),
        }

        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/survey/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          const message = errData?.detail ?? 'Failed to publish survey on server.'
          setSaveError(message)
          setSaving(false)
          return
        }

        const data = await res.json()
        console.log('server response:', data)
        survey.serverId = data.id

      } catch {
        setSaveError('Could not reach the server. Check your connection.')
        setSaving(false)
        return
      }
    }

    if (finalStatus === 'active' && status === 'draft' && id) {
      await deleteSurvey(id)
    }

    await saveSurvey(survey)
    setStatus(finalStatus)
    setSaving(false)
    navigate('/')
  }

  const statusConfig: Record<SurveyStatus, { label: string; color: string; next: SurveyStatus; nextLabel: string }> = {
    draft: {
      label: 'Draft',
      color: 'bg-gray-100 text-gray-500',
      next: 'active',
      nextLabel: '🟢 Set active',
    },
    active: {
      label: 'Active',
      color: 'bg-green-50 text-green-700',
      next: 'close',
      nextLabel: '🔴 Close survey',
    },
    close: {
      label: 'Closed',
      color: 'bg-red-50 text-red-500',
      next: 'draft',
      nextLabel: '📝 Reopen as draft',
    },
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← Back
          </button>
          <span className="text-gray-200">|</span>
          <h1 className="text-sm font-medium text-gray-900">
            {isEditing ? 'Edit survey' : 'New survey'}
          </h1>
        </div>

        <div className="flex items-center gap-2">

          {/* ← Error message shown here in topbar */}
          {saveError && (
            <span className="text-xs text-red-500 max-w-xs text-right">
              {saveError}
            </span>
          )}

          {/* Status badge + toggle (only when editing) */}
          {isEditing && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[status].color}`}>
                {statusConfig[status].label}
              </span>
              <button
                onClick={() => handleSave(statusConfig[status].next)}
                disabled={saving}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                {statusConfig[status].nextLabel}
              </button>
            </div>
          )}

          {/* Save draft (only for new surveys) */}
          {!isEditing && (
            <button
              onClick={() => handleSave('draft')}
              disabled={!title.trim() || saving}
              className="text-sm px-4 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save as draft
            </button>
          )}

          {/* Save button */}
          <button
            onClick={() => handleSave()}
            disabled={!title.trim() || saving}
            className="text-sm px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Step: Meta */}
        {step === 'meta' && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">
                Step 1 of 2 — Survey info
              </p>
              <h2 className="text-xl font-medium text-gray-900 mb-1">
                Give your survey a title
              </h2>
              <p className="text-sm text-gray-400">
                This is what respondents will see at the top of the survey.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setSaveError('') }}
                  placeholder="e.g. Customer satisfaction Q2"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">
                  Description
                  <span className="text-gray-300 ml-1">(optional)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={e => { setDescription(e.target.value); setSaveError('') }}
                  placeholder="Brief explanation of what this survey is about"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => setStep('questions')}
              disabled={!title.trim()}
              className="self-start text-sm px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next → Add questions
            </button>
          </div>
        )}

        {/* Step: Questions */}
        {step === 'questions' && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">
                Step 2 of 2 — Questions
              </p>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-medium text-gray-900 mb-1">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-sm text-gray-400">{description}</p>
                  )}
                </div>
                <button
                  onClick={() => setStep('meta')}
                  className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
                >
                  Edit info
                </button>
              </div>
            </div>

            {questions.length > 0 && (
              <div className="flex flex-col gap-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-gray-400 w-5">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={q.label}
                        onChange={e => updateQuestion(q.id, e.target.value)}
                        placeholder="Type your question here..."
                        className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between pl-7">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={() => toggleRequired(q.id)}
                          className="w-3.5 h-3.5 accent-gray-900"
                        />
                        <span className="text-xs text-gray-400">Required</span>
                      </label>

                      <div className="flex items-center gap-1">
                        <button onClick={() => moveQuestion(q.id, 'up')} disabled={idx === 0}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M2 8l4-4 4 4"/>
                          </svg>
                        </button>
                        <button onClick={() => moveQuestion(q.id, 'down')} disabled={idx === questions.length - 1}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M2 4l4 4 4-4"/>
                          </svg>
                        </button>
                        <button onClick={() => removeQuestion(q.id)}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M2 2l8 8M10 2l-8 8"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {questions.length === 0 && (
              <div className="border border-dashed border-gray-200 rounded-xl py-12 flex flex-col items-center gap-2 text-gray-300">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M8 12h8M12 8v8"/>
                </svg>
                <p className="text-sm">No questions yet</p>
              </div>
            )}

            <button
              onClick={addQuestion}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 border border-dashed border-gray-200 hover:border-gray-400 rounded-xl py-3 px-4 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Add question
            </button>
          </div>
        )}
      </div>
    </div>
  )
}