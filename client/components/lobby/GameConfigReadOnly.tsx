'use client';

import type { Rules } from '@shared/types';
import { Zap, MousePointer, Timer } from 'lucide-react';

interface GameConfigReadOnlyProps {
  source: string | null;
  target: string | null;
  rules: Rules;
}

export function GameConfigReadOnly({ source, target, rules }: GameConfigReadOnlyProps) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <p className="label">Game Settings</p>

      {/* Pages */}
      <div className="flex flex-col gap-3">
        {(['source', 'target'] as const).map(field => (
          <div key={field} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {field === 'source' ? 'Start page' : 'Target page'}
            </label>
            <div className="card py-2.5" style={{ background: 'var(--muted-bg)' }}>
              {(field === 'source' ? source : target) ? (
                <span className="text-sm font-medium">
                  {field === 'source' ? source : target}
                </span>
              ) : (
                <span className="text-sm italic" style={{ color: 'var(--muted)' }}>
                  Not set yet
                </span>
              )}
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
            <div
              key={value}
              className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
                rules.gameMode === value
                  ? 'border-foreground bg-foreground text-background'
                  : 'opacity-40'
              }`}
              style={rules.gameMode === value
                ? { background: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }
                : { borderColor: 'var(--border)' }
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
            </div>
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
            <div
              key={key}
              className={`flex items-center justify-between border rounded-lg px-4 py-3 ${
                rules[key] ? 'border-foreground bg-foreground text-background' : 'opacity-40'
              }`}
              style={rules[key]
                ? { background: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }
                : { borderColor: 'var(--border)' }
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
            </div>
          ))}

          {/* Time limit */}
          <div className="card flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Timer size={15} style={{ color: 'var(--muted)' }} />
              <div>
                <p className="font-medium text-sm">Time limit</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {rules.timeLimit ? `${rules.timeLimit}s` : 'No limit'}
                </p>
              </div>
            </div>
            <span className="text-sm font-medium">
              {rules.timeLimit ? `${rules.timeLimit}s` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}