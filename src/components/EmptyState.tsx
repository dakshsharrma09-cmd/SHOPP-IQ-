

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full animate-fade-in">
      <div className="text-6xl mb-6 animate-bounce">
        {icon}
      </div>
      <h2 className="text-2xl font-bold font-heading mb-2 text-gray-900 dark:text-white">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">{subtitle}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
