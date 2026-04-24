import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

interface Question {
  id: string
  label: string
  required: boolean
}

interface Survey {
  id: string
  title: string
  description: string
  questions: Question[]
}

type AgeGroup = 'child' | 'teenager' | 'adult' | 'senior'
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

interface RespondentInfo {
  age_group: AgeGroup | ''
  gender: Gender | ''
  nationality: string
}

type Stage = 'loading' | 'closed' | 'not_found' | 'info' | 'question' | 'submitted'

export default function Filler() {
  const { id } = useParams()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [info, setInfo] = useState<RespondentInfo>({ age_group: '', gender: '', nationality: '' })
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSurvey() {
      try {
        const res = await fetch(`${SERVER_URL}/filler/${id}`)
        if (res.status === 404) { setStage('not_found'); return }
        if (!res.ok) { setStage('not_found'); return }
        const data = await res.json()
        if (data.state === 'close') { setStage('closed'); return }

        // Normalize questions from server format
        // Server stores: [{"1": "question text"}, {"2": "question text"}]
        const rawQuestions = data.question ?? []
        const normalized: Question[] = rawQuestions.map((q: Record<string, string>, idx: number) => {
          const label = Object.values(q)[0] as string
          return { id: String(idx + 1), label, required: true }
        })

        setSurvey({
          id: data.id,
          title: data.title,
          description: data.description,
          questions: normalized,
        })
        setStage('info')
      } catch {
        setStage('not_found')
      }
    }
    loadSurvey()
  }, [id])

  function handleInfoNext() {
    if (!info.age_group || !info.gender || !info.nationality.trim()) return
    setCurrentQ(0)
    setCurrentAnswer('')
    setStage('question')
  }

  function handleNext() {
    if (!survey) return
    const q = survey.questions[currentQ]
    if (q.required && !currentAnswer.trim()) return

    setAnswers(prev => ({ ...prev, [currentQ + 1]: currentAnswer }))

    if (currentQ + 1 < survey.questions.length) {
      setCurrentQ(prev => prev + 1)
      setCurrentAnswer(answers[currentQ + 2] ?? '')
    } else {
      handleSubmit({ ...answers, [currentQ + 1]: currentAnswer })
    }
  }

  function handleBack() {
    if (currentQ === 0) {
      setStage('info')
      return
    }
    setAnswers(prev => ({ ...prev, [currentQ + 1]: currentAnswer }))
    setCurrentQ(prev => prev - 1)
    setCurrentAnswer(answers[currentQ] ?? '')
  }

  async function handleSubmit(finalAnswers: Record<number, string>) {
    if (!survey) return
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        description: '',
        age_group: info.age_group,
        gender: info.gender,
        nationality: info.nationality,
        answers: Object.entries(finalAnswers).map(([k, v]) => ({ [k]: v })),
      }

      const res = await fetch(
        `${SERVER_URL}/filler/submit?surveys_id=${survey.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setStage('submitted')
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setInfo({ age_group: '', gender: '', nationality: '' })
    setAnswers({})
    setCurrentAnswer('')
    setCurrentQ(0)
    setStage('info')
  }

  // ── Loading ────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-400">Loading survey...</div>
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────
  if (stage === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-lg font-medium text-gray-900 mb-1">Survey not found</h1>
          <p className="text-sm text-gray-400">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  // ── Closed ─────────────────────────────────────────────
  if (stage === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-lg font-medium text-gray-900 mb-1">Survey is closed</h1>
          <p className="text-sm text-gray-400">This survey is no longer accepting responses.</p>
        </div>
      </div>
    )
  }

  // ── Submitted ──────────────────────────────────────────
  if (stage === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-6">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-lg font-medium text-gray-900 mb-2">Thank you!</h1>
          <p className="text-sm text-gray-400 mb-8">
            Your response has been recorded successfully.
          </p>
          <button
            onClick={handleReset}
            className="text-sm px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Submit another response
          </button>
        </div>
      </div>
    )
  }

  const progress = survey
    ? stage === 'info'
      ? 0
      : Math.round(((currentQ + 1) / survey.questions.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-gray-900 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Survey header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-base font-medium text-gray-900">{survey?.title}</h1>
        {survey?.description && (
          <p className="text-xs text-gray-400 mt-0.5">{survey.description}</p>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {/* ── Info stage ── */}
          {stage === 'info' && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                  Before we start
                </p>
                <h2 className="text-xl font-medium text-gray-900">
                  Tell us a bit about yourself
                </h2>
              </div>

              {/* Age group */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Age group <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['child', 'teenager', 'adult', 'senior'] as AgeGroup[]).map(ag => (
                    <button
                      key={ag}
                      onClick={() => setInfo(prev => ({ ...prev, age_group: ag }))}
                      className={`py-2.5 text-sm rounded-lg border capitalize transition-colors ${
                        info.age_group === ag
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {ag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Gender <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                  ] as { value: Gender; label: string }[]).map(g => (
                    <button
                      key={g.value}
                      onClick={() => setInfo(prev => ({ ...prev, gender: g.value }))}
                      className={`py-2.5 text-sm rounded-lg border transition-colors ${
                        info.gender === g.value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nationality */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Nationality <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={info.nationality}
                  onChange={e => setInfo(prev => ({ ...prev, nationality: e.target.value }))}
                  placeholder="e.g. Cameroonian"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <button
                onClick={handleInfoNext}
                disabled={!info.age_group || !info.gender || !info.nationality.trim()}
                className="self-start text-sm px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Start survey →
              </button>
            </div>
          )}

          {/* ── Question stage ── */}
          {stage === 'question' && survey && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs text-gray-400 mb-4">
                  Question {currentQ + 1} of {survey.questions.length}
                </p>
                <h2 className="text-xl font-medium text-gray-900 leading-snug">
                  {survey.questions[currentQ].label}
                  {survey.questions[currentQ].required && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </h2>
              </div>

              <textarea
                value={currentAnswer}
                onChange={e => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={5}
                autoFocus
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors resize-none"
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  ← Back
                </button>

                <button
                  onClick={handleNext}
                  disabled={
                    submitting ||
                    (survey.questions[currentQ].required && !currentAnswer.trim())
                  }
                  className="text-sm px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting
                    ? 'Submitting...'
                    : currentQ + 1 === survey.questions.length
                    ? 'Submit'
                    : 'Next →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}