import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ActionItem {
  label: string;
  description?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
}

export interface ActionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'slate';
  };
  meta?: { label: string; value: string }[];
  actions: ActionItem[];
}

export default function ActionPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  meta,
  actions,
}: ActionPanelProps) {
  // Tutup panel dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Kunci scroll body saat drawer terbuka di mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const badgeColorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Gelap / Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right sm:duration-500"
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-panel-title"
        >
          {/* Header Panel */}
          <div className="p-6 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="action-panel-title"
                    className="text-lg font-bold text-slate-900 tracking-tight"
                  >
                    {title}
                  </h2>
                  {badge && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        badgeColorMap[badge.variant || 'blue']
                      }`}
                    >
                      {badge.text}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="text-sm font-medium text-slate-600">{subtitle}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full h-8 w-8 -mr-1"
                aria-label="Tutup silang"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Meta Informasi Ringkas */}
            {meta && meta.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                {meta.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <span className="text-slate-400 font-medium block">{item.label}</span>
                    <span className="text-slate-700 font-semibold truncate block" title={item.value}>
                      {item.value || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Body / List Aksi */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Pilihan Aksi
            </p>
            <div className="space-y-2.5">
              {actions
                .filter((a) => !a.hidden)
                .map((action, idx) => {
                  const isDestructive = action.variant === 'destructive';
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={action.disabled}
                      onClick={action.onClick}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3.5 group ${
                        action.disabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                          : isDestructive
                          ? 'bg-red-50/50 border-red-200 text-red-700 hover:bg-red-100/70 hover:border-red-300 hover:shadow-xs active:scale-[0.99]'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-xs active:scale-[0.99]'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                          action.disabled
                            ? 'bg-slate-100 text-slate-400'
                            : isDestructive
                            ? 'bg-red-100 text-red-600 group-hover:bg-red-200'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                        }`}
                      >
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-tight flex items-center justify-between">
                          <span>{action.label}</span>
                          {action.disabled && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                              Tidak Ada
                            </span>
                          )}
                        </div>
                        {action.description && (
                          <p
                            className={`text-xs mt-0.5 leading-normal truncate ${
                              isDestructive ? 'text-red-500' : 'text-slate-500'
                            }`}
                          >
                            {action.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Footer Panel */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-slate-600 hover:bg-slate-200/70"
            >
              Tutup Panel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
