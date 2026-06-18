'use client';

import { WikiSearchInput } from '@/components/lobby/WikiSearchInput';
import { useEffect, useState } from 'react';

interface DailyRoute {
  date: string;
  source: string;
  target: string;
}

interface Candidate {
  id: number;
  date: string;
  source: string;
  target: string;
}

interface MonthData {
  routes: DailyRoute[];
  candidates: Candidate[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function AdminDailyPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [monthData, setMonthData] = useState<MonthData>({ routes: [], candidates: [] });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [manualSource, setManualSource] = useState('');
  const [manualTarget, setManualTarget] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const SERVER = process.env.NEXT_PUBLIC_SERVER_URL;

  const fetchMonth = async (pwd: string, year: number, month: number) => {
    const res = await fetch(
      `${SERVER}/api/admin/month?year=${year}&month=${month}`,
      { headers: { 'x-admin-password': pwd } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    setMonthData(data);
    return true;
  };

  const handleLogin = async () => {
    setLoading(true);
    const ok = await fetchMonth(password, currentYear, currentMonth);
    if (ok) setAuthed(true);
    else alert('Wrong password');
    setLoading(false);
  };

  useEffect(() => {
    if (authed) fetchMonth(password, currentYear, currentMonth);
  }, [currentYear, currentMonth, authed]);

  const approvedDates = new Set(monthData.routes.map(r => r.date.split('T')[0]));

  const selectedRoute = monthData.routes.find(
    r => r.date.split('T')[0] === selectedDate
  );

  const selectedCandidates = monthData.candidates.filter(
    c => c.date.split('T')[0] === selectedDate
  );

  const handleApprove = async (candidateId: number) => {
    await fetch(`${SERVER}/api/admin/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ candidateId, date: selectedDate }),
    });
    await fetchMonth(password, currentYear, currentMonth);
    setManualSource('');
    setManualTarget('');
  };

  const handleApproveManual = async () => {
    if (!manualSource.trim() || !manualTarget.trim()) return;
    await fetch(`${SERVER}/api/admin/approve-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ date: selectedDate, source: manualSource.trim(), target: manualTarget.trim() }),
    });
    await fetchMonth(password, currentYear, currentMonth);
    setManualSource('');
    setManualTarget('');
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await fetch(`${SERVER}/api/admin/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ date: selectedDate }),
    });
    await fetchMonth(password, currentYear, currentMonth);
    setRegenerating(false);
  };

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center gap-4">
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-black text-white rounded-lg px-4 py-2 font-medium"
        >
          {loading ? '...' : 'Login'}
        </button>
      </main>
    );
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return (
    <main className="flex h-screen overflow-hidden">
      <div className="flex-1 p-6 flex flex-col gap-4 border-r overflow-y-auto">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">←</button>
          <h2 className="text-xl font-bold">{MONTHS[currentMonth - 1]} {currentYear}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-semibold py-1">{d}</div>
          ))}

          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = formatDate(currentYear, currentMonth, day);
            const isApproved = approvedDates.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === today;

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setManualSource('');
                  setManualTarget('');
                }}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition relative
                  ${isSelected ? 'ring-2 ring-black' : ''}
                  ${isApproved ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'hover:bg-gray-100'}
                  ${isToday ? 'font-bold underline' : ''}
                `}
              >
                {day}
                {isApproved && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-100 rounded" /> Route approved
          </span>
          <span className="underline font-bold">17</span>
          <span>= today</span>
        </div>
      </div>

      <div className="w-80 flex-shrink-0 p-4 flex flex-col gap-4 overflow-y-auto">
        {!selectedDate ? (
          <p className="text-gray-400 text-sm text-center mt-8">Click a day to manage its route</p>
        ) : (
          <>
            <h3 className="font-bold text-lg">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', day: 'numeric', month: 'long'
              })}
            </h3>

            {selectedRoute && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col gap-1">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Approved route</p>
                <p className="text-sm font-medium">{selectedRoute.source}</p>
                <p className="text-xs text-gray-400">→ {selectedRoute.target}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Candidates</p>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs text-gray-400 hover:text-black transition disabled:opacity-40"
                >
                  {regenerating ? '...' : '🔄 Regenerate'}
                </button>
              </div>

              {selectedCandidates.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No candidates yet — click regenerate</p>
              ) : (
                selectedCandidates.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{c.source}</span>
                      <span className="text-xs text-gray-400 truncate">→ {c.target}</span>
                    </div>
                    <button
                      onClick={() => handleApprove(c.id)}
                      className="text-xs bg-black text-white rounded px-2 py-1 hover:bg-gray-800 transition flex-shrink-0 ml-2"
                    >
                      Pick
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Manual entry</p>
              <WikiSearchInput
                placeholder="Source page"
                value={manualSource}
                onChange={setManualSource}
              />
              <WikiSearchInput
                placeholder="Target page"
                value={manualTarget}
                onChange={setManualTarget}
              />
              <button
                onClick={handleApproveManual}
                disabled={!manualSource.trim() || !manualTarget.trim()}
                className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-40"
              >
                Approve manual route
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}