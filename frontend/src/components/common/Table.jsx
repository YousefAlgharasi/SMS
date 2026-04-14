/**
 * Responsive Table
 * - Desktop: standard table
 * - Mobile: renders mobileCard(row) if provided, otherwise scrollable table
 */
export default function Table({ columns, data, loading, emptyMessage = 'No data found', mobileCard }) {
  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-500">
      <div className="text-center">
        <div className="text-2xl mb-2 animate-pulse">◈</div>
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  );

  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-gray-500">
      <p className="text-sm">{emptyMessage}</p>
    </div>
  );

  return (
    <>
      {/* Mobile card list — only shown when mobileCard prop is provided */}
      {mobileCard && (
        <div className="sm:hidden divide-y divide-surface-border">
          {data.map((row, i) => (
            <div key={row._id || i}>
              {mobileCard(row)}
            </div>
          ))}
        </div>
      )}

      {/* Table — always shown on sm+, shown on mobile only if no mobileCard */}
      <div className={`overflow-x-auto ${mobileCard ? 'hidden sm:block' : ''}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide py-3 px-4 first:pl-5 last:pr-5 whitespace-nowrap"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row._id || i} className="table-row">
                {columns.map(col => (
                  <td key={col.key} className="py-3.5 px-4 first:pl-5 last:pr-5 text-sm">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
