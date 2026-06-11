'use client';

import { useState } from 'react';
import { socket } from '@/lib/socket';
import type { Rules } from '@shared/types';
import { validateWikiPage } from '@/services/wikipedia';
import { WikiSearchInput } from './WikiSearchInput';

interface GameConfigProps {
  lobbyCode: string;
  initialSource: string | null;
  initialTarget: string | null;
  initialRules: Rules;
}

const DEFAULT_RULES: Rules = {
  noCtrlF: false,
  noBack: false,
  noRightClick: false,
  noCategories: false,
  timeLimit: null,
};

export function GameConfig({ lobbyCode, initialSource, initialTarget, initialRules }: GameConfigProps) {
  const [source, setSource] = useState(initialSource || '');
  const [target, setTarget] = useState(initialTarget || '');
  const [rules, setRules] = useState<Rules>(initialRules || DEFAULT_RULES);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleRule = (key: keyof Omit<Rules, 'timeLimit'>) => {
    setRules(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!source.trim() || !target.trim()) {
      setError('Source and target pages are required');
      return;
    }
    if (source.trim() === target.trim()) {
      setError('Source and target must be different');
      return;
    }

    setError(null);
    setValidationError(null);
    setValidating(true);

    const [sourceValid, targetValid] = await Promise.all([
      validateWikiPage(source.trim()),
      validateWikiPage(target.trim()),
    ]);

    setValidating(false);

    if (!sourceValid && !targetValid) {
      setValidationError('Neither page exists on Wikipedia');
      return;
    }
    if (!sourceValid) {
      setValidationError(`"${source}" does not exist on Wikipedia`);
      return;
    }
    if (!targetValid) {
      setValidationError(`"${target}" does not exist on Wikipedia`);
      return;
    }

    socket.emit('lobby:configure', {
      code: lobbyCode,
      source: source.trim(),
      target: target.trim(),
      rules,
    }, (res: { ok: boolean; error?: string }) => {
      if (res.ok) setSaved(true);
      else setError(res.error || 'Unknown error');
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <h2 className="font-semibold text-gray-500 text-sm uppercase tracking-wide">
        Game Settings
      </h2>

      {/* Pages */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <WikiSearchInput
            label="Start page"
            placeholder="e.g. Napoleon"
            value={source}
            onChange={(val) => { setSource(val); setSaved(false); }}
          />

        </div>

        <div className="flex flex-col gap-1">
          <WikiSearchInput
            label="Target page"
            placeholder="e.g. Pizza"
            value={target}
            onChange={(val) => { setTarget(val); setSaved(false); }}
          />
        </div>
      </div>

      {/* Rules */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Rules</h3>

        {([
          { key: 'noCtrlF', label: 'No Ctrl+F', description: 'Search is disabled' },
          { key: 'noBack', label: 'No going back', description: 'Back button is disabled' },
          { key: 'noRightClick', label: 'No right click', description: 'Prevents opening in new tab' },
          { key: 'noCategories', label: 'No category links', description: 'Category links are disabled' },
        ] as const).map(({ key, label, description }) => (
          <button
            key={key}
            onClick={() => toggleRule(key)}
            className={`flex items-center justify-between border rounded-lg px-4 py-3 transition text-left ${rules[key] ? 'border-black bg-black text-white' : 'hover:bg-gray-50'
              }`}
          >
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className={`text-xs ${rules[key] ? 'text-gray-300' : 'text-gray-400'}`}>
                {description}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${rules[key] ? 'bg-white border-white' : 'border-gray-300'
              }`} />
          </button>
        ))}

        {/* Time limit */}
        <div className="flex items-center justify-between border rounded-lg px-4 py-3">
          <div>
            <p className="font-medium text-sm">Time limit</p>
            <p className="text-xs text-gray-400">0 = no limit</p>
          </div>
          <input
            type="number"
            min={0}
            max={600}
            step={30}
            value={rules.timeLimit || 0}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setRules(prev => ({ ...prev, timeLimit: val > 0 ? val : null }));
              setSaved(false);
            }}
            className="w-20 border rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {(error || validationError) && (
        <p className="text-red-500 text-sm">{error || validationError}</p>
      )}

      <button
        onClick={handleSave}
        disabled={validating}
        className="bg-black text-white rounded-lg px-4 py-2 font-medium hover:bg-gray-800 transition disabled:opacity-40"
      >
        {validating ? 'Checking pages...' : saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  );
}