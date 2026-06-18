'use client';

import { useState } from 'react';
import { socket } from '@/lib/socket';
import type { Rules } from '@shared/types';
import { randomWikiPage, validateWikiPage } from '@/services/wikipedia';
import { WikiSearchInput } from './WikiSearchInput';
import { Shuffle, Check, Zap, MousePointer, Timer, Save } from 'lucide-react';

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
  gameMode: 'speed',
  hideOpponents: false,
};

export function GameConfig({ lobbyCode, initialSource, initialTarget, initialRules }: GameConfigProps) {
  const [source, setSource] = useState(initialSource || '');
  const [target, setTarget] = useState(initialTarget || '');
  const [rules, setRules] = useState<Rules>(initialRules || DEFAULT_RULES);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [randomizing, setRandomizing] = useState<'source' | 'target' | null>(null);

  const toggleRule = (key: keyof Omit<Rules, 'timeLimit' | 'gameMode'>) => {
    setRules(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleRandom = async (field: 'source' | 'target') => {
    setRandomizing(field);
    try {
      const title = await randomWikiPage();
      if (field === 'source') setSource(title);
      else setTarget(title);
      setSaved(false);
    } catch {
      setError('Failed to fetch random page');
    } finally {
      setRandomizing(null);
    }
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
    <div className="flex flex-col gap-5 w-full">
      <p className="label">Game Settings</p>

      {/* Pages */}
      <div className="flex flex-col gap-3">
        {(['source', 'target'] as const).map(field => (
          <div key={field} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium capitalize">
              {field === 'source' ? 'Start page' : 'Target page'}
            </label>
            <div className="flex gap-2 items-stretch">
              <div className="flex-1">
                <WikiSearchInput
                  label=""
                  placeholder={field === 'source' ? 'e.g. Napoleon' : 'e.g. Pizza'}
                  value={field === 'source' ? source : target}
                  onChange={(val) => {
                    if (field === 'source') setSource(val);
                    else setTarget(val);
                    setSaved(false);
                  }}
                />
              </div>
              <button
                onClick={() => handleRandom(field)}
                disabled={randomizing === field}
                title="Random page"
                className="btn btn-secondary w-10 self-stretch flex-shrink-0 px-0"
              >
                {randomizing === field
                  ? <span className="text-xs" style={{ color: 'var(--muted)' }}>...</span>
                  : <Shuffle size={15} />
                }
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Game mode */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Game mode</p>
        <div className="flex flex-col gap-1.5">
          {([
            { value: 'speed', label: 'Speed', description: 'First to arrive wins', icon: Zap },
            { value: 'fewest_clicks', label: 'Fewest clicks', description: 'Least clicks wins, everyone finishes', icon: MousePointer },
          ] as const).map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              onClick={() => { setRules(prev => ({ ...prev, gameMode: value })); setSaved(false); }}
              className={`flex items-center justify-between border rounded-lg px-4 py-3 transition text-left ${
                rules.gameMode === value
                  ? 'border-foreground bg-foreground text-background'
                  : 'hover:bg-muted-bg'
              }`}
              style={rules.gameMode === value
                ? { background: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }
                : {}
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={15} />
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className={`text-xs ${rules.gameMode === value ? 'opacity-60' : ''}`}
                     style={rules.gameMode !== value ? { color: 'var(--muted)' } : {}}>
                    {description}
                  </p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                rules.gameMode === value ? 'bg-white border-white' : ''
              }`}
                style={rules.gameMode !== value ? { borderColor: 'var(--border)' } : {}}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Rules</p>
        <div className="flex flex-col gap-1.5">
          {([
            { key: 'noCtrlF', label: 'No Ctrl+F', description: 'Search is disabled' },
            { key: 'noBack', label: 'No going back', description: 'Back button is disabled' },
            { key: 'noRightClick', label: 'No right click', description: 'Prevents opening in new tab' },
            { key: 'noCategories', label: 'No category links', description: 'Category links are disabled' },
            { key: 'hideOpponents', label: 'Hide opponents', description: 'You cannot see other players\' progress' },
          ] as const).map(({ key, label, description }) => (
            <button
              key={key}
              onClick={() => toggleRule(key)}
              className={`flex items-center justify-between border rounded-lg px-4 py-3 transition text-left ${
                rules[key] ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted-bg'
              }`}
              style={rules[key]
                ? { background: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }
                : {}
              }
            >
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className={`text-xs ${rules[key] ? 'opacity-60' : ''}`}
                   style={!rules[key] ? { color: 'var(--muted)' } : {}}>
                  {description}
                </p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                rules[key] ? 'bg-white border-white' : ''
              }`}
                style={!rules[key] ? { borderColor: 'var(--border)' } : {}}
              />
            </button>
          ))}

          {/* Time limit */}
          <div className="card flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Timer size={15} style={{ color: 'var(--muted)' }} />
              <div>
                <p className="font-medium text-sm">Time limit</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>0 = no limit</p>
              </div>
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
              className="w-20 border rounded px-2 py-1 text-right text-sm focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>
      </div>

      {(error || validationError) && (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error || validationError}</p>
      )}

      <button
        onClick={handleSave}
        disabled={validating}
        className="btn btn-primary w-full"
      >
        {validating ? (
          'Checking pages...'
        ) : saved ? (
          <><Check size={15} /> Saved</>
        ) : (
          <><Save size={15} /> Save settings</>
        )}
      </button>
    </div>
  );
}