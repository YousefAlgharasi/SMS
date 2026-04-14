export default function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⌕</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="input pl-8" />
    </div>
  );
}
