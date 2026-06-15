'use client';

import { useState } from 'react';

interface Candidate {
  id: number;
  date: string;
  source: string;
  target: string;
}

interface ApprovedRoute {
  date: string;
  source: string;
  target: string;
}

export default function AdminDailyPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [approved, setApproved] = useState<ApprovedRoute[]>([]);
  const [approvedDates, setApprovedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const SERVER = process.env.NEXT_PUBLIC_SERVER_URL;

  const fetchData = async (pwd: string) => {
    const res = await fetch(`${SERVER}/api/admin/candidates`, {
      headers: { 'x-admin-password': pwd },
    });
    if (!res.ok) return false;
    const data = await res.json();
    setCandidates(data.candidates);
    setApproved(data.approved);
    setApprovedDates(data.approvedDates);
    return true;
  };

  const handleLogin = async () => {
    setLoading(true);
    const ok = await fetchData(password);
    if (ok) setAuthed(true);
    else alert('Wrong password');
    setLoading(false);
  };

  const handleApprove = async (candidate: Candidate) => {
    await fetch(`${SERVER}/api/admin/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ candidateId: candidate.id, date: candidate.date }),
    });
    await fetchData(password);
  };

  const handleRegenerate = async (date: string) => {
    await fetch(`${SERVER}/api/admin/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ date }),
    });
    await fetchData(password);
  };

  const byDate = candidates.reduce((acc, c) => {
    const d = c.date.split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(c);
    return acc;
  }, {} as Record<string, Candidate[]>);

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

  return (
    <main className="max-w-3xl mx-auto p-8 flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Daily Route Admin</h1>

      {Object.entries(byDate).sort().map(([date, dayCandidates]) => {
        const isApproved = approvedDates.includes(date);
        const approvedRoute = approved.find(r => r.date.split('T')[0] === date);

        return (
          <div key={date} className={`border rounded-xl p-4 flex flex-col gap-3 ${isApproved ? 'border-green-500' : ''}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              {isApproved && (
                <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5 font-medium">
                  ✓ Approved — {approvedRoute?.source} → {approvedRoute?.target}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {dayCandidates.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <span className="text-sm">
                    <span className="font-medium">{c.source}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="font-medium">{c.target}</span>
                  </span>
                  <button
                    onClick={() => handleApprove(c)}
                    className="text-xs bg-black text-white rounded px-3 py-1 hover:bg-gray-800 transition"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleRegenerate(date)}
              className="text-xs text-gray-400 hover:text-black transition text-left"
            >
              🔄 Generate 5 new candidates
            </button>
          </div>
        );
      })}
    </main>
  );
}