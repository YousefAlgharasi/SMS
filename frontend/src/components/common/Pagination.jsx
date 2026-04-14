export default function Pagination({ page, pages, total, limit, onPageChange }) {
  if (pages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // On mobile show fewer page numbers
  const getPageNumbers = () => {
    const nums = [];
    const maxVisible = 3;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) nums.push(i);
    return nums;
  };

  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-surface-border flex-wrap gap-2">
      <p className="text-xs text-gray-500">Showing {start}–{end} of {total}</p>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-2 sm:px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ←
        </button>
        {getPageNumbers().map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg text-xs font-medium transition-colors ${
              page === p ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white hover:bg-surface-2'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="px-2 sm:px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
