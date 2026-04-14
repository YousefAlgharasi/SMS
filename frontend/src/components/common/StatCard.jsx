export default function StatCard({ title, value, subtitle, icon, trend, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-600/20 text-brand-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
    amber: 'bg-amber-600/20 text-amber-400',
    red: 'bg-red-600/20 text-red-400',
    purple: 'bg-purple-600/20 text-purple-400'
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg ${colors[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-1.5 sm:px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-white mb-1 truncate">{value}</p>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide leading-tight">{title}</p>
      {subtitle && <p className="text-xs text-gray-600 mt-1 truncate">{subtitle}</p>}
    </div>
  );
}
