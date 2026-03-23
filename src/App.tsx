import { useEffect, useMemo, useState } from 'react'
import {
  Bus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
} from 'lucide-react'

type CategoryKey = 'general' | 'senior' | 'child' | 'disabled'

type StopRow = {
  id: number
  stopOrder: number
  stopName: string
  general: number
  senior: number
  child: number
  disabled: number
}

type TripState = {
  rows: StopRow[]
  isConfirmed: boolean
  confirmedAt: string
}

type TripData = Record<string, TripState>

type Summary = {
  totalGeneral: number
  totalSenior: number
  totalChild: number
  totalDisabled: number
  totalPassengers: number
}

const STORAGE_KEY = 'community-bus-counter-app-v1'

const stopNames = [
  '学園都市駅前',
  '太山寺中学校北',
  '太山寺中学校南',
  '学園東地域福祉センター',
  '学園東町6丁目西',
  '神戸高専グラウンド前',
  '学園東町7丁目南',
  '湯屋ヶ谷公園',
  '学園東町6丁目東',
  '学園東町4丁目東',
  '学園東町北公園',
  '学園東町4丁目北',
  '東町小学校前',
  '学園東町（流通科学大学前）',
  '学園都市駅前（ロータリー）',
] as const

const tripOptions = Array.from({ length: 10 }, (_, i) => `${i + 1}便`)
const categories: Array<{ key: CategoryKey; label: string }> = [
  { key: 'general', label: '一般' },
  { key: 'senior', label: '高齢者' },
  { key: 'child', label: '子供' },
  { key: 'disabled', label: '障害者' },
]

function createInitialRows(): StopRow[] {
  return stopNames.map((stopName, index) => ({
    id: index + 1,
    stopOrder: index + 1,
    stopName,
    general: 0,
    senior: 0,
    child: 0,
    disabled: 0,
  }))
}

function createInitialTrips(): TripData {
  return Object.fromEntries(
    tripOptions.map((trip) => [
      trip,
      {
        rows: createInitialRows(),
        isConfirmed: false,
        confirmedAt: '',
      },
    ]),
  )
}

function rowTotal(row: Pick<StopRow, CategoryKey>): number {
  return Number(row.general || 0) + Number(row.senior || 0) + Number(row.child || 0) + Number(row.disabled || 0)
}

function escapeCsvCell(cell: unknown): string {
  return `"${String(cell ?? '').replace(/"/g, '""')}"`
}

function buildCsv(headers: Array<string | number>, csvRows: Array<Array<string | number>>): string {
  return [headers, ...csvRows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n')
}

function calculateSummary(rows: StopRow[]): Summary {
  const totalGeneral = rows.reduce((sum, row) => sum + Number(row.general || 0), 0)
  const totalSenior = rows.reduce((sum, row) => sum + Number(row.senior || 0), 0)
  const totalChild = rows.reduce((sum, row) => sum + Number(row.child || 0), 0)
  const totalDisabled = rows.reduce((sum, row) => sum + Number(row.disabled || 0), 0)
  return {
    totalGeneral,
    totalSenior,
    totalChild,
    totalDisabled,
    totalPassengers: totalGeneral + totalSenior + totalChild + totalDisabled,
  }
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function runTests(): void {
  const sampleRow: StopRow = {
    id: 1,
    stopOrder: 1,
    stopName: '学園都市駅前',
    general: 2,
    senior: 3,
    child: 1,
    disabled: 4,
  }
  console.assert(rowTotal(sampleRow) === 10, 'rowTotal should sum all categories')

  const csv = buildCsv(['A', 'B'], [[1, 'x"y']])
  console.assert(csv === '"A","B"\n"1","x""y"', 'buildCsv should escape quotes and join with newline')

  const summary = calculateSummary([
    { id: 1, stopOrder: 1, stopName: 'a', general: 1, senior: 2, child: 3, disabled: 4 },
    { id: 2, stopOrder: 2, stopName: 'b', general: 0, senior: 1, child: 0, disabled: 1 },
  ])
  console.assert(summary.totalPassengers === 12, 'calculateSummary should total passengers correctly')

  const trips = createInitialTrips()
  console.assert(Object.keys(trips).length === 10, 'createInitialTrips should create 10 trips')
  console.assert(trips['1便'].rows.length === stopNames.length, 'each trip should include all stops')
}

runTests()

function CounterButton({
  onClick,
  icon,
  disabled = false,
}: {
  onClick: () => void
  icon: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="counter-btn">
      {icon}
    </button>
  )
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(todayString())
  const [selectedTrip, setSelectedTrip] = useState<string>('1便')
  const [tripData, setTripData] = useState<TripData>(createInitialTrips())
  const [lastSavedAt, setLastSavedAt] = useState<string>(formatTime(new Date()))
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          selectedDate?: string
          selectedTrip?: string
          tripData?: TripData
          lastSavedAt?: string
        }
        if (parsed.selectedDate) setSelectedDate(parsed.selectedDate)
        if (parsed.selectedTrip) setSelectedTrip(parsed.selectedTrip)
        if (parsed.tripData) setTripData(parsed.tripData)
        if (parsed.lastSavedAt) setLastSavedAt(parsed.lastSavedAt)
      } catch (error) {
        console.error('保存データの読み込みに失敗しました', error)
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedDate,
        selectedTrip,
        tripData,
        lastSavedAt,
      }),
    )
  }, [selectedDate, selectedTrip, tripData, lastSavedAt, isLoaded])

  const currentTrip = tripData[selectedTrip]
  const rows = currentTrip.rows
  const currentTripIndex = tripOptions.indexOf(selectedTrip)

  const summary = useMemo(() => calculateSummary(rows), [rows])
  const dailySummary = useMemo(() => {
    return tripOptions.reduce<Summary>(
      (acc, trip) => {
        const tripSummary = calculateSummary(tripData[trip].rows)
        acc.totalGeneral += tripSummary.totalGeneral
        acc.totalSenior += tripSummary.totalSenior
        acc.totalChild += tripSummary.totalChild
        acc.totalDisabled += tripSummary.totalDisabled
        acc.totalPassengers += tripSummary.totalPassengers
        return acc
      },
      { totalGeneral: 0, totalSenior: 0, totalChild: 0, totalDisabled: 0, totalPassengers: 0 },
    )
  }, [tripData])

  const stampSave = () => setLastSavedAt(formatTime(new Date()))

  const updateCount = (id: number, key: CategoryKey, delta: number) => {
    setTripData((prev) => ({
      ...prev,
      [selectedTrip]: {
        ...prev[selectedTrip],
        rows: prev[selectedTrip].rows.map((row) => {
          if (row.id !== id) return row
          const nextValue = Math.max(0, Number(row[key] || 0) + delta)
          return { ...row, [key]: nextValue }
        }),
      },
    }))
    stampSave()
  }

  const moveTrip = (direction: number) => {
    const nextIndex = currentTripIndex + direction
    if (nextIndex < 0 || nextIndex >= tripOptions.length) return
    setSelectedTrip(tripOptions[nextIndex])
  }

  const resetCurrentTrip = () => {
    setTripData((prev) => ({
      ...prev,
      [selectedTrip]: {
        rows: createInitialRows(),
        isConfirmed: false,
        confirmedAt: '',
      },
    }))
    stampSave()
  }

  const confirmCurrentTrip = () => {
    const timeText = formatTime(new Date())
    setTripData((prev) => ({
      ...prev,
      [selectedTrip]: {
        ...prev[selectedTrip],
        isConfirmed: true,
        confirmedAt: timeText,
      },
    }))
    setLastSavedAt(timeText)
  }

  const exportCurrentTripCSV = () => {
    const headers = ['日付', '便名', '停留所順', 'バス停名', '一般', '高齢者', '子供', '障害者', '合計', '確定']
    const csvRows = tripData[selectedTrip].rows.map((row) => [
      selectedDate,
      selectedTrip,
      row.stopOrder,
      row.stopName,
      row.general,
      row.senior,
      row.child,
      row.disabled,
      rowTotal(row),
      tripData[selectedTrip].isConfirmed ? `済 (${tripData[selectedTrip].confirmedAt})` : '未確定',
    ])
    const csv = buildCsv(headers, csvRows)
    downloadCsv(`コミュニティバス_${selectedDate}_${selectedTrip}.csv`, csv)
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <header className="topbar">
          <div className="brand-row">
            <div className="brand-left">
              <div className="brand-icon">
                <Bus size={20} />
              </div>
              <div>
                <div className="brand-title">コミュニティバス入力</div>
                <div className="brand-subtitle">iPhone・タブレット対応</div>
              </div>
            </div>
            <div className="save-badge">
              <Save size={14} /> {lastSavedAt}
            </div>
          </div>

          <div className="top-grid">
            <div>
              <Label className="field-label">運行日</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  stampSave()
                }}
                className="field-input"
              />
            </div>
            <div>
              <Label className="field-label">便名</Label>
              <div className="trip-picker">
                <button type="button" className="icon-btn" onClick={() => moveTrip(-1)} disabled={currentTripIndex <= 0}>
                  <ChevronLeft size={18} />
                </button>
                <select
                  value={selectedTrip}
                  onChange={(e) => setSelectedTrip(e.target.value)}
                  className="trip-select"
                >
                  {tripOptions.map((trip) => (
                    <option key={trip} value={trip}>
                      {trip} {tripData[trip].isConfirmed ? '✓' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => moveTrip(1)}
                  disabled={currentTripIndex >= tripOptions.length - 1}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="summary-grid">
            <section className="summary-card">
              <div className="summary-label">現在便 合計</div>
              <div className="summary-value">{summary.totalPassengers}</div>
            </section>
            <section className="summary-card">
              <div className="summary-label">1日 合計</div>
              <div className="summary-value">{dailySummary.totalPassengers}</div>
            </section>
          </div>

          <div className="action-row">
            <button type="button" className="primary-btn" onClick={confirmCurrentTrip}>
              <CheckCircle2 size={16} />
              {currentTrip.isConfirmed ? '確定済み' : 'この便を確定'}
            </button>
            <button type="button" className="secondary-btn square" onClick={exportCurrentTripCSV} aria-label="CSVをダウンロード">
              <Download size={16} />
            </button>
          </div>

          <div className="status-row">
            <span>状態</span>
            <strong className={currentTrip.isConfirmed ? 'status-ok' : 'status-warn'}>
              {currentTrip.isConfirmed ? `確定済み ${currentTrip.confirmedAt}` : '入力中'}
            </strong>
          </div>
        </header>

        <main className="content-list">
          {rows.map((row) => (
            <section key={row.id} className="stop-card">
              <div className="stop-card-header">
                <div className="stop-title">
                  {row.stopOrder}. {row.stopName}
                </div>
                <div className="stop-total">{rowTotal(row)}人</div>
              </div>

              {categories.map((category) => (
                <div key={category.key} className="count-row">
                  <div className="count-label">{category.label}</div>
                  <div className="count-controls">
                    <CounterButton
                      onClick={() => updateCount(row.id, category.key, -1)}
                      icon={<Minus size={16} />}
                      disabled={row[category.key] <= 0}
                    />
                    <div className="count-number">{row[category.key]}</div>
                    <CounterButton onClick={() => updateCount(row.id, category.key, 1)} icon={<Plus size={16} />} />
                  </div>
                </div>
              ))}
            </section>
          ))}
        </main>

        <footer className="bottom-bar">
          <button type="button" className="secondary-btn" onClick={resetCurrentTrip}>
            <RotateCcw size={16} /> リセット
          </button>
          <button type="button" className="secondary-btn" onClick={() => setSelectedTrip('1便')}>
            <Smartphone size={16} /> 1便へ
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => moveTrip(1)}
            disabled={currentTripIndex >= tripOptions.length - 1}
          >
            次の便
          </button>
        </footer>
      </div>
    </div>
  )
}
