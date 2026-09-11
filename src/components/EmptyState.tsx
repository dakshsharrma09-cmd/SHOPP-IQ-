

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
      <div className="text-4xl mb-4">
        {icon}
      </div>
      <h2 className="text-lg font-semibold font-heading mb-1 text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{subtitle}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
