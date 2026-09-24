import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Select...", disabled = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <div 
        className={`w-full border border-gray-300 rounded p-2 text-sm bg-white flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
        onClick={() => { if (!disabled) { setIsOpen(!isOpen); setSearch(""); } }}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>{value || placeholder}</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded p-1 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <div 
              key={opt} 
              className="p-2 text-sm hover:bg-blue-50 cursor-pointer"
              onClick={() => { onChange(opt); setIsOpen(false); }}
            >
              {opt}
            </div>
          )) : (
            <div className="p-2 text-sm text-gray-500">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}
