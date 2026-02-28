"use client";

import { GraduationCap, Loader2, X } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface UniversityResult {
  name: string;
  country: string;
  alpha_two_code: string;
  domain: string;
}

interface UniversitySearchProps {
  value: string;
  onChange: (university: string) => void;
  inputId?: string;
}

const UniversitySearch = ({
  value,
  onChange,
  inputId,
}: UniversitySearchProps) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<UniversityResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUniversities = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/universities?q=${encodeURIComponent(searchQuery)}`,
      );
      const data: UniversityResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(""); // Clear selected university when typing

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      searchUniversities(val);
    }, 300);
  };

  const selectUniversity = (uni: UniversityResult) => {
    const display = `${uni.name} (${uni.country})`;
    setQuery(display);
    onChange(display);
    setIsOpen(false);
    setResults([]);
    inputRef.current?.blur();
  };

  const clearSelection = () => {
    setQuery("");
    onChange("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          selectUniversity(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <GraduationCap
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
          size={18}
        />
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          placeholder="Search your university..."
          className="w-full bg-white/5 border border-white/10 pl-12 pr-12 py-4 focus:outline-none focus:border-cyan-500 transition-colors font-bold text-white placeholder:text-white/10"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <Loader2
            className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500 animate-spin"
            size={18}
          />
        )}
        {!isLoading && value && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/50">
          {results.map((uni, i) => (
            <button
              key={`${uni.name}-${uni.domain}`}
              type="button"
              className={`w-full text-left px-4 py-3 transition-colors border-b border-white/5 last:border-b-0 ${
                i === selectedIndex
                  ? "bg-cyan-500/10 border-l-2 border-l-cyan-500"
                  : "hover:bg-white/5"
              }`}
              onClick={() => selectUniversity(uni)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="font-bold text-sm text-white/90 truncate">
                {uni.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/70">
                  {uni.alpha_two_code}
                </span>
                <span className="text-[10px] font-bold text-white/30 truncate">
                  {uni.country}
                </span>
                <span className="text-[10px] font-mono text-white/20 ml-auto truncate">
                  {uni.domain}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UniversitySearch;
