import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import baubleImage from '../images/AI Bauble.png'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const DEFAULT_EXERCISE_ID = 'loop-basics-1'
const EXERCISE_KEY_PREFIX = 'practice-cpp-tutor:exercise:'
const SELECTED_EXERCISE_KEY = 'practice-cpp-tutor:selected-exercise'
const SETTINGS_KEY = 'practice-cpp-tutor:settings'
const HISTORY_KEY = 'practice-cpp-tutor:history'
const PARTICIPANT_KEY = 'practice-cpp-tutor:participant-id'
const BAUBLE_POSITION_KEY = 'practice-cpp-tutor:bauble-position'
const BAUBLE_SIZE = 76

const NAV_ITEMS = [
  { id: 'activities', label: 'My Activities', icon: 'grid' },
  { id: 'logic', label: 'Code Logic', icon: 'code' },
]

const WALKTHROUGH = [
  ['Predict', 'Read the code and predict the value at the checkpoint before running it.'],
  ['Run', 'Use Run & Check to execute the program and record what happens.'],
  ['Compare', 'Compare your prediction with actual execution and the required result.'],
  ['Reflect', 'Trace the relevant lines and use the tutor’s question to explain any difference.'],
  ['Revise', 'Submit a new prediction. Change your code only if it does not meet the required result.'],
]

const LOGIC_CARDS = [
  ['int x', 'Variables & data types', 'A variable stores a value whose type determines how C++ represents and uses it.'],
  ['if / else', 'Selection', 'Conditional statements choose which block runs based on a Boolean expression.'],
  ['while', 'Loops', 'Repeat a block of code while its condition is true.'],
  ['f(x)', 'Functions & parameters', 'Functions group reusable instructions; arguments provide inputs, and return values carry results back.'],
  ['&x', 'Pass by value & reference', 'Pass by value gives a function a copy; pass by reference lets it work with the caller’s variable.'],
  ['a && b', 'Arithmetic & Boolean expressions', 'Operators combine values; precedence and parentheses determine how an expression is evaluated.'],
  ['cin / cout', 'Input & output', 'Read values from standard input with cin and display results with cout.'],
]

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

function exerciseStorageKey(exerciseId) {
  return `${EXERCISE_KEY_PREFIX}${exerciseId}`
}

function requirementLabel(operator, expected) {
  const symbols = { eq: '=', le: '≤', ge: '≥', lt: '<', gt: '>' }
  return `${symbols[operator] || operator} ${expected}`
}

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function clampBaublePosition(position) {
  return {
    x: Math.max(8, Math.min(position.x, window.innerWidth - BAUBLE_SIZE - 8)),
    y: Math.max(8, Math.min(position.y, window.innerHeight - BAUBLE_SIZE - 8)),
  }
}

function readBaublePosition() {
  const initialPosition = {
    x: window.innerWidth - BAUBLE_SIZE - 28,
    y: Math.round(window.innerHeight * 0.46),
  }
  try {
    const stored = JSON.parse(localStorage.getItem(BAUBLE_POSITION_KEY))
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y)) {
      return clampBaublePosition(stored)
    }
  } catch {
    return initialPosition
  }
  return initialPosition
}

function Icon({ name, size = 18 }) {
  const paths = {
    sparkle: <><path d="M12 2.5 14.4 9.6 21.5 12l-7.1 2.4L12 21.5l-2.4-7.1L2.5 12l7.1-2.4L12 2.5Z" /><path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7L19 2Z" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    code: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M12 15h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.5 1.5c-1.2 1.2-2.1 1.6-2.1 3M12 17.5h.01" /></>,
    play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    save: <><path d="M20 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l4 4Z" /><path d="M8 4v5h8V4M8 20v-6h8v6" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" /></>,
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.code}
    </svg>
  )
}

function App() {
  const [view, setView] = useState('welcome')
  const [exercises, setExercises] = useState([])
  const [exerciseId, setExerciseId] = useState(() => localStorage.getItem(SELECTED_EXERCISE_KEY) || DEFAULT_EXERCISE_ID)
  const [exercise, setExercise] = useState(null)
  const [code, setCode] = useState('')
  const [settings, setSettings] = useState(() => ({ theme: 'dark', fontSize: 14, condition: 'eed', ...readStorage(SETTINGS_KEY, {}) }))
  const [history, setHistory] = useState(() => readStorage(HISTORY_KEY, []))
  const [participantId, setParticipantId] = useState(() => localStorage.getItem(PARTICIPANT_KEY) || makeId('P'))
  const [exerciseError, setExerciseError] = useState('')
  const [pageBusy, setPageBusy] = useState(false)
  const [backendError, setBackendError] = useState('')
  const [checkpointActive, setCheckpointActive] = useState(false)
  const [prediction, setPrediction] = useState('')
  const [lastPrediction, setLastPrediction] = useState(null)
  const [predictionPending, setPredictionPending] = useState(false)
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('prediction')
  const [hintVisible, setHintVisible] = useState(true)
  const [aiOpen, setAiOpen] = useState(false)
  const [sessionId, setSessionId] = useState(() => makeId('S'))
  const [checkpointIndex, setCheckpointIndex] = useState(0)
  const [testCaseIndex, setTestCaseIndex] = useState(0)
  const [saved, setSaved] = useState(true)
  const [fontSize, setFontSize] = useState(settings.fontSize || 14)

  const checkpoint = exercise?.checkpoints?.[checkpointIndex]
  const testCase = checkpoint?.tests?.[testCaseIndex]
  const activeLine = checkpointActive && checkpoint
    ? result?.trace?.[0]?.line || checkpoint.line
    : null
  const lineCount = useMemo(() => code.split('\n').length, [code])

  const loadExercise = useCallback(async () => {
    setPageBusy(true)
    setExerciseError('')
    try {
      const response = await fetch(`${API_URL}/api/exercises/${exerciseId}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `The backend returned HTTP ${response.status}.`)
      setExercise(data)
      setCode(localStorage.getItem(exerciseStorageKey(exerciseId)) || data.starter_code)
      setCheckpointIndex(0)
      setTestCaseIndex(0)
    } catch (error) {
      setExerciseError(error.message || 'Could not load the exercise.')
    } finally {
      setPageBusy(false)
    }
  }, [exerciseId])

  const loadExercises = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/exercises`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `The backend returned HTTP ${response.status}.`)
      setExercises(data.exercises || [])
    } catch (error) {
      setExerciseError(error.message || 'Could not load the activity list.')
    }
  }, [])

  useEffect(() => {
    loadExercises()
    loadExercise()
  }, [loadExercise, loadExercises])

  useEffect(() => {
    if (exercise) {
      localStorage.setItem(exerciseStorageKey(exercise.id), code)
      setSaved(true)
    }
  }, [code, exercise])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    localStorage.setItem(PARTICIPANT_KEY, participantId)
  }, [participantId])

  const selectActivity = (id) => {
    localStorage.setItem(SELECTED_EXERCISE_KEY, id)
    setView('details')
    if (id === exerciseId) {
      if (!exercise) loadExercise()
      return
    }
    setExerciseId(id)
    setExercise(null)
    setCode('')
    setCheckpointIndex(0)
    setTestCaseIndex(0)
    setCheckpointActive(false)
    setPrediction('')
    setLastPrediction(null)
    setPredictionPending(false)
    setResult(null)
    setBackendError('')
  }

  const beginExercise = () => {
    setView('editor')
    setCheckpointActive(false)
    setPrediction('')
    setLastPrediction(null)
    setPredictionPending(false)
    setResult(null)
    setBackendError('')
    setSessionId(makeId('S'))
    setCheckpointIndex(0)
    setTestCaseIndex(0)
    setActiveTab('prediction')
    setHintVisible(true)
    setAiOpen(false)
  }

  const startCheckpoint = () => {
    if (!exercise || pageBusy) return
    setCheckpointActive(true)
    setActiveTab('prediction')
    setBackendError('')
  }

  const submitPrediction = () => {
    if (!checkpointActive) {
      startCheckpoint()
      return
    }
    if (pageBusy || (!prediction.trim() && prediction !== '0')) return
    setLastPrediction(prediction.trim())
    setPredictionPending(true)
    setBackendError('')
    setActiveTab('prediction')
    setHintVisible(false)
    setAiOpen(false)
  }

  const submitNotSure = () => {
    setLastPrediction('__not_sure__')
    setPredictionPending(true)
    setBackendError('')
  }

  const runCheck = async () => {
    if (pageBusy) return
    if (!checkpointActive) {
      startCheckpoint()
      return
    }
    if (!lastPrediction) {
      setBackendError('Enter your prediction and select Submit Prediction before running the check.')
      return
    }
    setPageBusy(true)
    setBackendError('')
    setHintVisible(true)
    try {
      const response = await fetch(`${API_URL}/api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: exerciseId,
          session_id: sessionId,
          participant_id: participantId,
          checkpoint_id: checkpoint?.id,
          test_case: testCaseIndex,
          code,
          prediction: lastPrediction === '__not_sure__' ? null : lastPrediction,
          condition: settings.condition,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `The backend returned HTTP ${response.status}.`)
      if (data.status === 'compile_error') {
        setResult(data)
        setPredictionPending(false)
        setBackendError(`Your C++ code did not compile.\n${data.detail || ''}`)
        setActiveTab('output')
        return
      }
      if (data.status === 'checkpoint_not_reached') {
        setResult(data)
        setPredictionPending(false)
        setActiveTab('trace')
        return
      }
      if (data.status === 'not_sure') {
        setResult(data)
        setLastPrediction(null)
        setPredictionPending(false)
        setActiveTab('prediction')
        return
      }
      if (data.status !== 'ok') throw new Error(data.detail || `Unexpected backend response: ${data.status || 'unknown status'}.`)
      setResult(data)
      setPredictionPending(false)
      setActiveTab('prediction')
      setHistory((previous) => [{
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        exerciseId,
        exerciseTitle: exercise.title,
        prediction: lastPrediction,
        case: data.case,
        hintLevel: data.tutor?.level || 0,
        condition: settings.condition,
        outcome: data.case === 'A' ? 'Resolved' : data.case === 'C' ? 'Hint shown' : data.case === 'D' ? 'Revise code' : 'Review prediction',
      }, ...previous].slice(0, 100))
    } catch (error) {
      setBackendError(error.message || 'The check could not be completed.')
    } finally {
      setPageBusy(false)
    }
  }

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }))
    if (key === 'fontSize') setFontSize(value)
  }
  const updateParticipantId = (value) => {
    const normalized = value.trim().slice(0, 80)
    setParticipantId(normalized || makeId('P'))
  }

  const closeHint = () => {
    setHintVisible(false)
    setAiOpen(false)
  }
  const toggleAiTutor = () => {
    if (result?.tutor) {
      setHintVisible((visible) => !visible)
      setAiOpen(false)
    } else {
      setAiOpen((open) => !open)
    }
  }
  const headerAction = view === 'editor' ? runCheck : null
  const outcome = result?.case
  const comparison = result?.comparison
  const requiredText = comparison
    ? requirementLabel(comparison.operator, comparison.expected)
    : 'the required result'
  const actualValue = comparison?.actual
  const stateLabel = !checkpointActive ? 'State 01 / 09 · Normal coding'
    : !lastPrediction ? 'State 02 / 09 · Checkpoint'
      : predictionPending && result ? 'State 08 / 09 · Student revision'
        : predictionPending ? 'State 03 / 09 · Prediction submitted'
        : outcome === 'A' ? 'State 09 / 09 · Resolution'
          : outcome === 'C' ? 'State 07 / 09 · Socratic intervention'
            : 'State 08 / 09 · Student revision'

  if (view === 'welcome') {
    return <WelcomePage onEnter={() => setView('activities')} />
  }

  return (
    <div className={`app-shell theme-${settings.theme}`} style={{ '--editor-font-size': `${fontSize}px` }}>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setView('activities')}>
          <Icon name="sparkle" size={25} />
          <span>Practice C++ Tutor</span>
        </button>
        <div className="topbar-actions">
          <span className="save-status"><span className="save-dot" />{saved ? 'Saved' : 'Saving…'}</span>
          {headerAction && (
            <button className="button button-primary top-run" type="button" onClick={headerAction} disabled={pageBusy || !exercise}>
              <Icon name="play" size={17} />{pageBusy ? 'Checking…' : 'Run & Check'}
            </button>
          )}
        </div>
      </header>

      <aside className="sidebar">
        <div className="profile-card">
          <div className="avatar">S</div>
          <div><strong>Student Name</strong><span>C++</span></div>
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`nav-item ${view === item.id ? 'selected' : ''}`} type="button"
              onClick={() => setView(item.id)}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
            </button>
          ))}
          <button className={`nav-item ${view === 'editor' ? 'selected' : ''}`} type="button" onClick={() => setView('editor')}>
            <Icon name="terminal" size={19} /><span>Current activity</span>
          </button>
        </nav>
        <div className="sidebar-label">ACTIVITIES</div>
        <div className="activity-nav">
          {exercises.map((item, index) => (
            <button key={item.id} className={`nav-item ${item.id === exerciseId && view === 'editor' ? 'selected' : ''}`}
              type="button" onClick={() => selectActivity(item.id)}>
              <Icon name="book" size={19} /><span>Activity {index + 1} · {item.title}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className={`nav-item ${view === 'settings' ? 'selected' : ''}`} type="button" onClick={() => setView('settings')}>
            <Icon name="settings" size={19} /><span>Settings</span>
          </button>
          <button className={`nav-item ${view === 'help' ? 'selected' : ''}`} type="button" onClick={() => setView('help')}>
            <Icon name="help" size={19} /><span>Help</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {view === 'editor' && (
          <Workspace
            exercise={exercise}
            loading={pageBusy && !exercise}
            loadError={exerciseError}
            retry={loadExercise}
            code={code}
            setCode={setCode}
            lineCount={lineCount}
            activeLine={activeLine}
            stateLabel={stateLabel}
            checkpointActive={checkpointActive}
            checkpoint={checkpoint}
            checkpointIndex={checkpointIndex}
            setCheckpointIndex={(value) => { setCheckpointIndex(value); setTestCaseIndex(0); setResult(null); setLastPrediction(null); setPrediction('') }}
            testCase={testCase}
            testCaseIndex={testCaseIndex}
            setTestCaseIndex={(value) => { setTestCaseIndex(value); setResult(null); setLastPrediction(null); setPrediction('') }}
            prediction={prediction}
            setPrediction={setPrediction}
            lastPrediction={lastPrediction}
            predictionPending={predictionPending}
            submitPrediction={submitPrediction}
            runCheck={runCheck}
            submitNotSure={submitNotSure}
            pageBusy={pageBusy}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            result={result}
            outcome={outcome}
            comparison={comparison}
            requiredText={requiredText}
            actualValue={actualValue}
            backendError={backendError}
            hintVisible={hintVisible}
            closeHint={closeHint}
            aiOpen={aiOpen}
            toggleAiTutor={toggleAiTutor}
            fontSize={fontSize}
            condition={settings.condition}
            participantId={participantId}
          />
        )}
        {view === 'activities' && <Activities exercises={exercises} onOpen={selectActivity} />}
        {view === 'details' && <ActivityDetails exercise={exercise} error={exerciseError} loading={pageBusy} onStart={beginExercise} onHistory={() => setView('history')} />}
        {view === 'history' && <HistoryPage history={history} onBack={() => setView('details')} />}
        {view === 'logic' && <LogicPage />}
        {view === 'settings' && <SettingsPage settings={settings} updateSetting={updateSetting} participantId={participantId} updateParticipantId={updateParticipantId} />}
        {view === 'help' && <HelpPage />}
      </main>
    </div>
  )
}

function WelcomePage({ onEnter }) {
  return (
    <main className="welcome-page">
      <div className="welcome-glow welcome-glow-one" aria-hidden="true" />
      <div className="welcome-glow welcome-glow-two" aria-hidden="true" />
      <header className="welcome-header">
        <div className="welcome-brand"><Icon name="sparkle" size={24} /><span>Practice C++ Tutor</span></div>
        <span className="welcome-label">RESEARCH PROTOTYPE <i /> C++ LOGIC DEBUGGING</span>
      </header>

      <section className="welcome-content" aria-labelledby="welcome-title">
        <div className="welcome-kicker"><span /> AN EXPECTATION–EXECUTION DIVERGENCE STUDY</div>
        <h1 id="welcome-title">
          Assessing Expectation-Execution Divergence in a Context-Aware Socratic AI Tutoring System for Enhanced Novice C++ Logic Error Debugging
        </h1>
        <div className="welcome-divider"><span /><span /><span /></div>

        <div className="welcome-researchers">
          <div className="welcome-person">
            <span className="welcome-person-role">RESEARCHER</span>
            <strong>Jazztine Kirvy Gonzales</strong>
            <span>Bachelor of Science in Computer Science</span>
          </div>
          <div className="welcome-person">
            <span className="welcome-person-role">RESEARCHER</span>
            <strong>Leonard Christian D. Arganda</strong>
            <span>Bachelor of Science in Computer Science</span>
          </div>
        </div>

        <div className="welcome-adviser">
          <span>ADVISER</span>
          <strong>Joshua C. Martinez</strong>
        </div>

        <button className="welcome-enter" type="button" onClick={onEnter}>
          ENTER <Icon name="arrow" size={18} />
        </button>
        <p className="welcome-caption">Explore activities and practice debugging C++ logic.</p>
      </section>

      <footer className="welcome-footer"><span>LEARN BY PREDICTING, EXECUTING, AND REFLECTING</span><span>2026</span></footer>
    </main>
  )
}

function AITutorBauble({ hint, hintVisible, aiOpen, onToggle, onDismiss }) {
  const [position, setPosition] = useState(readBaublePosition)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(null)
  const movedRef = useRef(false)
  const showingHint = Boolean(hint && hintVisible)
  const isOpen = hint ? showingHint : aiOpen
  const rightRoom = window.innerWidth - position.x - BAUBLE_SIZE - 24
  const leftRoom = position.x - 24
  const opensToRight = rightRoom >= leftRoom
  const narrowScreen = Math.max(rightRoom, leftRoom) < 240
  const cardWidth = Math.max(0, Math.min(320, window.innerWidth - 24, narrowScreen ? 320 : opensToRight ? rightRoom : leftRoom))
  const cardPosition = {
    left: narrowScreen
      ? Math.max(12, Math.min(position.x + BAUBLE_SIZE / 2 - cardWidth / 2, window.innerWidth - cardWidth - 12))
      : opensToRight ? position.x + BAUBLE_SIZE + 12 : position.x - cardWidth - 12,
    top: narrowScreen
      ? position.y < window.innerHeight / 2
        ? Math.max(12, Math.min(position.y + BAUBLE_SIZE + 12, window.innerHeight - 180))
        : Math.max(12, Math.min(position.y - 180, window.innerHeight - 180))
      : Math.max(12, Math.min(position.y - 36, window.innerHeight - 200)),
    width: `${cardWidth}px`,
  }

  useEffect(() => {
    localStorage.setItem(BAUBLE_POSITION_KEY, JSON.stringify(position))
  }, [position])

  useEffect(() => {
    const handleResize = () => setPosition((current) => clampBaublePosition(current))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      startX: event.clientX,
      startY: event.clientY,
    }
    movedRef.current = false
    setIsDragging(true)
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) {
      movedRef.current = true
    }
    setPosition(clampBaublePosition({
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    }))
  }

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      setIsDragging(false)
    }
  }

  const handleClick = () => {
    if (movedRef.current) {
      movedRef.current = false
      return
    }
    onToggle()
  }

  return (
    <div
      className={`ai-bauble-widget ${isDragging ? 'is-dragging' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isOpen && (
        <aside className="ai-bauble-card" style={cardPosition} aria-live="polite">
          <div className="ai-bauble-card-heading">
            <div className="ai-bauble-card-title">
              <span>{hint ? 'READ-ONLY' : 'PRACTICE C++ TUTOR'}</span>
              {hint && <strong>{hint.exhausted ? 'Fallback · support complete' : hint.level < 4 ? `Hint ${hint.level} of 3` : 'Fallback'}</strong>}
            </div>
            <button type="button" onClick={onDismiss} aria-label="Dismiss AI tutor message">
              <Icon name="close" size={16} />
            </button>
          </div>
          <p>{hint?.message || 'AI guidance appears after you submit a prediction and run a check. Drag me anywhere on the screen.'}</p>
          {hint && <button className="ai-bauble-dismiss" type="button" onClick={onDismiss}>Dismiss</button>}
        </aside>
      )}
      <button
        className="ai-bauble-button"
        type="button"
        aria-label={isOpen ? 'Close AI tutor' : 'Open AI tutor'}
        aria-expanded={isOpen}
        title="Drag to move · Click to open the tutor"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <img src={baubleImage} alt="" draggable="false" />
        {hint && !hintVisible && <span className="ai-bauble-badge" aria-label="New tutor hint">1</span>}
      </button>
    </div>
  )
}

function evaluateCondition(value, operator, boundary) {
  switch (operator) {
    case '<': return value < boundary
    case '<=': return value <= boundary
    case '>': return value > boundary
    case '>=': return value >= boundary
    case '==': return value === boundary
    case '!=': return value !== boundary
    default: return null
  }
}

function Workspace(props) {
  const {
    exercise, loading, loadError, retry, code, setCode, lineCount, activeLine, stateLabel,
    checkpointActive, checkpoint, testCase, testCaseIndex, setTestCaseIndex,
    prediction, setPrediction, lastPrediction, predictionPending, submitPrediction,
    runCheck, submitNotSure, pageBusy, activeTab, setActiveTab, result, outcome, comparison, requiredText,
    actualValue, backendError, hintVisible, closeHint, aiOpen, toggleAiTutor, fontSize,
    condition, participantId, checkpointIndex, setCheckpointIndex,
  } = props
  const editorRef = useRef(null)
  const highlightRef = useRef(null)
  const gutterRef = useRef(null)

  const onEditorScroll = (event) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = event.currentTarget.scrollTop
      highlightRef.current.scrollLeft = event.currentTarget.scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop
  }

  return (
    <section className="workspace">
      <div className="workspace-toolbar">
        <div className="file-tab"><Icon name="terminal" size={16} /><span>main.cpp</span><button aria-label="Close file" type="button"><Icon name="close" size={13} /></button></div>
        <button className="new-tab" aria-label="New file" type="button">+</button>
        <span className="task-caption">{exercise?.title || 'Loading activity'} · {exercise?.summary || ''}</span>
        <span className={`state-label ${outcome === 'A' ? 'state-success' : outcome === 'C' ? 'state-error' : ''}`}>{stateLabel}</span>
      </div>
      <div className="study-strip">
        <span>Participant {participantId}</span><span>{condition === 'eed' ? 'EED-guided tutor' : 'Generic Socratic tutor'}</span>
        {checkpoint?.tests?.length > 1 && (
          <label>Sample
            <select value={testCaseIndex} onChange={(event) => setTestCaseIndex(Number(event.target.value))} disabled={pageBusy}>
              {checkpoint.tests.map((test, index) => <option key={`${test.label}-${index}`} value={index}>{test.label}</option>)}
            </select>
          </label>
        )}
        {exercise?.checkpoints?.length > 1 && (
          <label>Checkpoint
            <select value={checkpointIndex} onChange={(event) => {
              setCheckpointIndex(Number(event.target.value))
              setTestCaseIndex(0)
            }} disabled={pageBusy}>
              {exercise.checkpoints.map((item, index) => <option key={item.id} value={index}>{item.question}</option>)}
            </select>
          </label>
        )}
      </div>

      {loadError && (
        <div className="error-banner load-error" role="alert">
          <div><strong>Couldn’t connect to the backend</strong><span>{loadError}</span></div>
          <button className="button button-secondary" type="button" onClick={retry}>Try again</button>
        </div>
      )}
      {backendError && <div className="error-banner" role="alert"><span>{backendError}</span></div>}

      {loading ? (
        <div className="loading-panel"><span className="spinner" />Loading the activity from the backend…</div>
      ) : (
        <>
          <div className="editor-panel">
            <div className="code-gutter" ref={gutterRef} aria-hidden="true">
              {Array.from({ length: lineCount }, (_, index) => (
                <div className={index + 1 === activeLine ? 'current-line' : ''} key={index}>{index + 1}</div>
              ))}
            </div>
            <div className="code-area">
              <pre className="code-highlight" ref={highlightRef} aria-hidden="true" style={{ fontSize: `${fontSize}px` }}>
                {code.split('\n').map((line, index) => (
                  <div className={`code-line ${index + 1 === activeLine ? 'current-line' : ''}`} key={index}>
                    {highlightLine(line) || '\u00a0'}
                  </div>
                ))}
              </pre>
              <textarea
                ref={editorRef}
                className="code-input"
                aria-label="C++ source code"
                spellCheck="false"
                autoCapitalize="off"
                autoCorrect="off"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onScroll={onEditorScroll}
                style={{ fontSize: `${fontSize}px` }}
              />
              {checkpointActive && activeLine && (
                <span className={`line-badge ${!predictionPending && outcome === 'A' ? 'badge-success' : !predictionPending && (outcome === 'C' || outcome === 'D') ? 'badge-error' : ''}`}>
                  <Icon name={!predictionPending && outcome === 'A' ? 'check' : 'help'} size={13} />
                  {predictionPending ? 'Prediction submitted' : outcome === 'A' ? 'Verified' : outcome === 'C' ? 'Divergence' : outcome === 'D' ? 'Revise code' : 'Checkpoint'}
                </span>
              )}
            </div>
          </div>

          <AITutorBauble
            hint={result?.tutor}
            hintVisible={hintVisible}
            aiOpen={aiOpen}
            onToggle={toggleAiTutor}
            onDismiss={closeHint}
          />

          <section className="console-panel">
            <div className="console-tabs" role="tablist" aria-label="Workspace panels">
              <button className={activeTab === 'prediction' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'prediction'} onClick={() => setActiveTab('prediction')}>
                <Icon name="help" size={17} />Prediction
              </button>
              <button className={activeTab === 'trace' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'trace'} onClick={() => setActiveTab('trace')}>
                <Icon name="refresh" size={17} />Execution Trace
              </button>
              <button className={activeTab === 'output' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'output'} onClick={() => setActiveTab('output')}>
                <Icon name="book" size={17} />Output
              </button>
            </div>

            {activeTab === 'prediction' && (
              <div className="console-content prediction-grid">
                <div className="prediction-form">
                  <h3>{predictionPending && result ? `Revised prediction · Line ${result?.trace?.[0]?.line || checkpoint?.line}` : result?.case === 'A' ? 'Verified prediction' : result?.case === 'B' ? 'Revise your prediction' : lastPrediction ? `Your prediction · Line ${result?.trace?.[0]?.line || checkpoint?.line}` : 'Your prediction'}</h3>
                  <p className="muted-text">
                    {!checkpointActive ? 'Keep coding. Prediction opens when a checkpoint is reached.'
                      : !lastPrediction ? `${checkpoint?.question} Predict before running.`
                        : predictionPending && result ? 'New expectation submitted. The previous result belongs to an earlier attempt.'
                        : result?.case === 'A' ? 'Your prediction matches execution and the exercise goal.'
                          : 'Revise your code, then make a new prediction before running again.'}
                  </p>
                  <label className="sr-only" htmlFor="prediction-input">Your predicted value for count</label>
                  <input id="prediction-input" className="prediction-input" inputMode="decimal"
                    placeholder={checkpointActive ? 'Enter your predicted value…' : 'No checkpoint active'}
                    disabled={!checkpointActive || pageBusy}
                    value={prediction}
                    onChange={(event) => setPrediction(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter' && checkpointActive) submitPrediction() }}
                  />
                  <div className="prediction-actions">
                    <button className={`button ${checkpointActive ? 'button-primary' : 'button-muted'} submit-prediction`}
                      type="button" onClick={submitPrediction}
                      disabled={pageBusy || (checkpointActive && !prediction.trim() && prediction !== '0')}>
                      {lastPrediction && !result ? 'Prediction submitted' : result?.case === 'A' ? 'Prediction verified' : 'Submit Prediction'}
                    </button>
                    {checkpointActive && !lastPrediction && (
                      <button className="button button-secondary not-sure" type="button" disabled={pageBusy} onClick={submitNotSure}>
                        Not sure
                      </button>
                    )}
                  </div>
                  {lastPrediction && predictionPending && <p className="inline-note">Prediction saved · run the check when you’re ready.</p>}
                </div>

                <div className="comparison-area">
                  {result?.status === 'not_sure' ? (
                    <div className="trace-card"><strong>Prediction skipped</strong><span>You can still review the code and submit a number when you’re ready.</span></div>
                  ) : comparison ? (
                    <Comparison outcome={outcome} comparison={comparison} requiredText={requiredText} category={result.category} checkpoint={checkpoint} />
                  ) : (
                    <>
                      <h3>Execution Trace</h3>
                      <div className="trace-card">
                        <strong>{checkpointActive ? `Paused before line ${checkpoint?.line || 6}` : 'No run yet'}</strong>
                        <span>{checkpointActive ? 'Submit a prediction before execution to record your expectation.' : 'Runtime values appear after a prediction is submitted.'}</span>
                      </div>
                      <p className="inline-note">{checkpointActive ? 'Execution is waiting · no runtime result revealed.' : 'AI is silent while you code.'}</p>
                    </>
                  )}
                  {!comparison && lastPrediction && !result && (
                    <div className="submitted-expectation"><span>Student prediction · checkpoint</span><strong>{checkpoint?.expr} = {lastPrediction}</strong><small>Waiting for execution and comparison.</small></div>
                  )}
                  {comparison && predictionPending && (
                    <p className="inline-note">Previous result shown above; the revised prediction is waiting for execution.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'trace' && (
              <div className="trace-content">
                <h3>{comparison ? `Execution Trace · attempt ${result.tutor?.level || 1}` : 'Execution Trace'}</h3>
                {comparison ? (
                  <div className="trace-list">
                    {(result.trace || []).map((event, index) => (
                      <TraceRow key={`${event.line}-${index}`} number={index + 1}
                        title={`Line ${event.line} · ${event.label}`}
                        detail={`${event.expression} = ${event.value}`}
                        tone={outcome === 'C' ? 'error' : outcome === 'A' ? 'success' : ''} />
                    ))}
                    {result.timed_out && <div className="inline-note">Execution stopped after reaching the configured time limit.</div>}
                  </div>
                ) : (
                  <div className="trace-card">
                    <strong>{result?.status === 'checkpoint_not_reached' ? 'Checkpoint not reached' : checkpointActive ? `Paused before line ${checkpoint?.line}` : 'No run yet'}</strong>
                    <span>{result?.detail || result?.runtime_error || (result?.timed_out ? 'Execution reached the configured time limit.' : 'Submit a prediction, then use Run &amp; Check to see runtime values.')}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'output' && (
              <div className="output-content">
                <h3>Program Output</h3>
                {!result || result.status === 'not_sure' ? (
                  <div className="trace-card"><strong>No output yet</strong><span>The backend checks the checkpoint and prediction together.</span></div>
                ) : result.status === 'compile_error' ? (
                  <div className="trace-card"><strong>Compilation failed</strong><span>Fix the compiler errors shown above, then submit a new prediction.</span></div>
                ) : result.status === 'checkpoint_not_reached' ? (
                  <div className="trace-card"><strong>{result.timed_out ? 'Execution timed out before the checkpoint' : 'Checkpoint not reached'}</strong><span>{result.detail || result.runtime_error || 'Review the code and run the check again.'}</span></div>
                ) : (
                  <>
                    <pre className="output-terminal"><span className="terminal-prompt">$</span>{result.stdout ? `\n${result.stdout.trimEnd()}` : ' (no standard output)'}</pre>
                    <div className={`result-summary ${outcome === 'A' ? 'summary-success' : outcome === 'C' || outcome === 'D' || result.output_ok === false ? 'summary-error' : 'summary-neutral'}`}>
                      <strong>{outcome === 'A' ? 'Exercise requirement met' : outcome === 'B' ? 'Prediction differed from execution' : outcome === 'C' ? 'The required result is not met yet' : outcome === 'D' ? 'Prediction matched; revise the code' : 'Check complete'}</strong>
                      <span>{comparison
                        ? `Observed ${comparison.expression} = ${comparison.actual} · ${result.sample_output_ok ? 'sample output matches' : 'sample output does not match'} · hidden tests ${result.hidden_test_summary?.passed ?? 0}/${result.hidden_test_summary?.total ?? 0} · required ${requiredText}`
                        : 'The backend returned a result for this attempt.'}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}

function highlightLine(line) {
  const tokens = /(#include\s*<[^>]+>|"[^"\n]*"|\/\/[^\n]*|\b(?:int|return|while|using|namespace|std)\b|\b(?:cout|cin|endl)\b|\b\d+\b)/g
  const output = []
  let cursor = 0
  for (const match of line.matchAll(tokens)) {
    const start = match.index
    if (start > cursor) output.push(line.slice(cursor, start))
    const token = match[0]
    const kind = token.startsWith('#') ? 'syntax-preprocessor'
      : token.startsWith('"') ? 'syntax-string'
        : token.startsWith('//') ? 'syntax-comment'
          : /^\d+$/.test(token) ? 'syntax-number'
            : /^(cout|cin|endl|std)$/.test(token) ? 'syntax-builtin' : 'syntax-keyword'
    output.push(<span className={kind} key={`${start}-${token}`}>{token}</span>)
    cursor = start + token.length
  }
  if (cursor < line.length) output.push(line.slice(cursor))
  return output
}

function Comparison({ outcome, comparison, requiredText, category, checkpoint }) {
  const labels = outcome === 'A' ? ['Prediction matches execution and the exercise goal.', 'Prediction = execution = required · loop skipped · output: Done']
    : outcome === 'B' ? ['Prediction differs from execution, but the program meets the required result. No code error is flagged.', 'Trace the code, then submit a new prediction.']
      : outcome === 'C' ? ['Prediction differs from execution; the required result is not met.', `Required: ${requiredText}. Observed: ${checkpoint.expr} = ${comparison.actual} at the same checkpoint.`]
        : ['The code meets the requirement, but the prediction needs another look.', 'Compare your expected value with the observed value.']
  const tone = outcome === 'A' ? 'success' : outcome === 'C' || outcome === 'D' ? 'error' : 'neutral'
  const verdict = (value) => {
    if (value === 'student') return `${comparison.expression} = ${comparison.prediction}`
    if (value === 'actual') return `${comparison.expression} = ${comparison.actual}`
    return requiredText
  }
  const captions = outcome === 'A'
    ? ['your expectation', 'matches execution', 'exercise requirement met']
    : outcome === 'C' ? ['your expectation', 'observed at checkpoint', 'exercise requirement']
      : outcome === 'D' ? ['matches runtime', 'observed value', 'required by exercise']
        : ['student expectation', 'runtime value', 'required by exercise']

  return (
    <div className="comparison-wrap">
      <h3>{comparison.expression} · checkpoint on line {checkpoint.line}</h3>
      <div className="comparison-cards">
        {['student', 'actual', 'required'].map((key) => (
          <div className={`comparison-card card-${key} ${key === 'actual' ? `tone-${tone}` : ''}`} key={key}>
            <span>{key === 'student' ? 'Student Prediction' : key === 'actual' ? 'Actual Execution' : 'Required Result'}</span>
            <strong>{verdict(key)}</strong>
            <small>{captions[key === 'student' ? 0 : key === 'actual' ? 1 : 2]}</small>
          </div>
        ))}
      </div>
      <div className={`comparison-verdict tone-${tone}`}>
        <strong>{outcome === 'A' ? `Misconception resolved · ${category || 'Correct behavior'}` : outcome === 'B' ? 'Prediction needs another look' : outcome === 'C' ? `First meaningful divergence · Line ${checkpoint.line}` : outcome === 'D' ? 'Prediction is accurate · revise the code' : 'Check complete'}</strong>
        <span>{outcome === 'A' ? 'Your prediction matches the observed execution and the exercise requirement.'
          : outcome === 'C' ? `Category: ${category || 'Unclassified'} · Required: ${requiredText}. Observed: ${comparison.expression} = ${comparison.actual}.`
            : outcome === 'D' ? `Your prediction matches execution, but ${comparison.expression} = ${comparison.actual} does not meet ${requiredText}.`
            : labels[0]}</span>
      </div>
    </div>
  )
}

function TraceRow({ number, title, detail, tone = '' }) {
  return <div className={`trace-row ${tone ? `trace-${tone}` : ''}`}><span className="trace-number">{number}</span><div><strong>{title}</strong><span>{detail}</span></div></div>
}

function PageHeading({ breadcrumb, title, description }) {
  return <div className="page-heading"><div className="breadcrumb">{breadcrumb}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
}

function Activities({ exercises, onOpen }) {
  return (
    <div className="page-view">
      <PageHeading breadcrumb="Workspace / My Activities" title="My Activities" description="Choose an activity to practice predicting and tracing C++ code." />
      <div className="activity-cards">
        {exercises.map((activity, index) => (
          <article className="activity-card" key={activity.id}>
            <div className="activity-icon"><Icon name="code" size={23} /></div>
            <div className="activity-info">
              <div className="activity-meta"><span>Activity {index + 1}</span><span className="category-chip">{activity.category}</span></div>
              <h2>{activity.title}</h2><p>{activity.summary}</p>
            </div>
            <div className="activity-actions">
              <span className="status-chip active">Available</span>
              <button className="button button-secondary" type="button" onClick={() => onOpen(activity.id)}>
                View activity
              </button>
            </div>
          </article>
        ))}
        {!exercises.length && <div className="trace-card">No activities are available. Check that the backend is running.</div>}
      </div>
    </div>
  )
}

function ActivityDetails({ exercise, error, loading, onStart, onHistory }) {
  return (
    <div className="page-view">
      <PageHeading breadcrumb={`My Activities / ${exercise?.title || 'Activity'} / Details`} title={exercise?.title || 'Activity details'} description={exercise?.summary} />
      {loading && <div className="loading-panel"><span className="spinner" />Loading activity details…</div>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      {exercise && <>
        <section className="detail-card">
          <div className="detail-tags"><span className="category-chip">{exercise.category}</span><span className="status-chip active">Available</span></div>
          <h2>{exercise.title}</h2>
          <p>{exercise.statement}</p>
          <div className="detail-columns">
            <div><h3>Input</h3><p>{exercise.specification.input}</p></div>
            <div><h3>Output</h3><p>{exercise.specification.output}</p></div>
          </div>
          <p className="muted-text">Constraints: {exercise.specification.constraints}</p>
        </section>
        <h2 className="section-title">Sample test cases</h2>
        <div className="sample-grid">
          {exercise.sample_tests.map((sample) => (
            <article className="sample-card" key={sample.label}>
              <strong>{sample.label}</strong>
              <div><span>Input</span><pre>{sample.input || '(no input)'}</pre></div>
              <div><span>Expected output</span><pre>{sample.expected_output}</pre></div>
            </article>
          ))}
        </div>
      </>}
      <div className="page-actions">
        <button className="button button-primary" type="button" onClick={onStart} disabled={!exercise || loading}>Start activity <Icon name="arrow" size={16} /></button>
        <button className="button button-secondary" type="button" onClick={onHistory}>View history</button>
      </div>
    </div>
  )
}

function HistoryPage({ history, onBack }) {
  return (
    <div className="page-view">
      <PageHeading breadcrumb="My Activities / History" title="Your attempts" description="Your recent local attempts across activities." />
      <div className="history-table-wrap">
        <table className="history-table">
          <thead><tr><th>Attempt</th><th>Activity</th><th>Date</th><th>Prediction result</th><th>Tutor condition</th><th>Hint level</th><th>Outcome</th></tr></thead>
          <tbody>
            {history.length ? history.map((entry, index) => (
              <tr key={entry.id}><td>Attempt {history.length - index}</td><td>{entry.exerciseTitle || entry.exerciseId || 'Activity'}</td><td>{formatDate(entry.date)}</td>
                <td><span className={`status-chip ${entry.case === 'A' || entry.case === 'D' ? 'active' : ''}`}>{entry.case === 'A' || entry.case === 'D' ? 'Matched' : 'Differed'}</span></td>
                <td>{entry.condition === 'generic' ? 'Generic' : 'EED-guided'}</td>
                <td>{entry.hintLevel ? `Level ${Math.min(entry.hintLevel, 3)}${entry.hintLevel > 3 ? ' · fallback' : ''}` : '—'}</td>
                <td className={entry.case === 'A' ? 'text-success' : ''}>{entry.outcome}</td></tr>
            )) : (
              <tr><td className="empty-history" colSpan="7">No attempts yet. Complete a prediction and check to see your history here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted-text history-note">This view is saved in this browser. The backend also records anonymized attempts for local research export.</p>
      <div className="page-actions">
        <a className="button button-secondary" href={`${API_URL}/api/research/export`}>Download research CSV</a>
      <button className="button button-secondary" type="button" onClick={onBack}>Back to activity</button>
      </div>
    </div>
  )
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function LogicPage() {
  return (
    <div className="page-view">
      <PageHeading breadcrumb="Workspace / Code Logic" title="Code Logic" description="A quick reference for the C++ concepts in your activities." />
      <div className="logic-cards">
        {LOGIC_CARDS.map(([symbol, title, description]) => (
          <article className="logic-card" key={title}><div className="logic-symbol">{symbol}</div><div><h2>{title}</h2><p>{description}</p></div></article>
        ))}
      </div>
    </div>
  )
}

function SettingsPage({ settings, updateSetting, participantId, updateParticipantId }) {
  return (
    <div className="page-view">
      <PageHeading breadcrumb="Workspace / Settings" title="Settings" description="Adjust the workspace and research-prototype session settings." />
      <section className="settings-card">
        <div className="setting-row"><div><h2>Anonymous participant code</h2><p>Use a study code assigned by your research team; do not enter your name.</p></div>
          <input className="prediction-input settings-participant" aria-label="Anonymous participant code" maxLength={80}
            value={participantId} onChange={(event) => updateParticipantId(event.target.value)} />
        </div>
        <div className="setting-row"><div><h2>Tutor condition</h2><p>For a study, set this to the condition assigned to the participant.</p></div>
          <select className="condition-select" aria-label="Tutor condition" value={settings.condition || 'eed'} onChange={(event) => updateSetting('condition', event.target.value)}>
            <option value="eed">EED-guided Socratic</option>
            <option value="generic">Generic Socratic</option>
          </select>
        </div>
        <div className="setting-row"><div><h2>Theme</h2><p>Choose the workspace appearance.</p></div>
          <div className="setting-options">{['dark', 'light'].map((theme) => <button key={theme} className={`button button-secondary ${settings.theme === theme ? 'option-selected' : ''}`} type="button" onClick={() => updateSetting('theme', theme)}>{theme === 'dark' ? '●' : '○'} <span>{theme[0].toUpperCase() + theme.slice(1)}</span></button>)}</div>
        </div>
        <div className="setting-row"><div><h2>Editor font size</h2><p>Text size in the code editor.</p></div>
          <div className="setting-options">{[12, 14, 16].map((size) => <button key={size} className={`button button-secondary font-option ${settings.fontSize === size ? 'option-selected' : ''}`} type="button" onClick={() => updateSetting('fontSize', size)}>{size} px</button>)}</div>
        </div>
      </section>
    </div>
  )
}

function HelpPage() {
  return (
    <div className="page-view">
      <PageHeading breadcrumb="Workspace / Help" title="Help" description="How Practice C++ Tutor works" />
      <section className="help-card">
        {WALKTHROUGH.map(([title, description], index) => (
          <article className="help-step" key={title}><span className="step-number">{index + 1}</span><div><h2>{title}</h2><p>{description}</p></div></article>
        ))}
      </section>
    </div>
  )
}

export default App
