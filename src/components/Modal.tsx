import { useEffect, type ReactNode } from 'react';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b1c33]/45 px-4 py-8"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="rise w-full max-w-2xl rounded-xl border border-[#e6e8ec] bg-white shadow-[0_24px_48px_rgba(11,28,51,0.18)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#f0f1f3] px-5 py-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold tracking-tight text-[#201f1e]">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-[#605e5c]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[#605e5c] hover:bg-[#f3f2f1]"
          >
            Close
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
