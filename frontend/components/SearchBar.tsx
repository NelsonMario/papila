'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchIngredientsForProfiles, IngredientSearchResult } from '@/lib/api';

interface SearchBarProps {
  placeholder?: string;
  onSelect: (ingredient: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function SearchBar({
  placeholder = 'What are you cooking with?',
  onSelect,
  autoFocus = false,
  disabled = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IngredientSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    if (term.length < 1) {
      setResults([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await searchIngredientsForProfiles(term, 8);
      setResults(res.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      search(query);
    }, 150);
    return () => clearTimeout(debounce);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleSelect(query.trim().toLowerCase());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(results[selectedIndex].name);
        } else if (query.trim()) {
          handleSelect(query.trim().toLowerCase());
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <motion.div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className="w-full px-8 py-5 text-lg bg-white rounded-full
                     text-neutral-900 placeholder-neutral-400
                     border border-neutral-200
                     focus:border-neutral-900 focus:shadow-lg
                     focus:outline-none transition-all duration-300
                     disabled:opacity-50"
        />
        
        <AnimatePresence>
          {isLoading && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-6 top-1/2 -translate-y-1/2"
            >
              <motion.div
                className="w-5 h-5 rounded-full border-2 border-neutral-200 border-t-neutral-600"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute z-50 w-full mt-3 bg-white rounded-2xl border border-neutral-200 
                     shadow-xl overflow-hidden"
          >
            <ul className="py-2">
              {results.map((item, index) => (
                <motion.li
                  key={`${item.name}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    onClick={() => handleSelect(item.name)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-6 py-3 flex items-center justify-between 
                               text-left transition-all duration-200 capitalize
                      ${index === selectedIndex 
                        ? 'bg-neutral-900 text-white' 
                        : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className={`text-xs ${index === selectedIndex ? 'text-neutral-400' : 'text-neutral-400'}`}>
                        {item.category}
                      </span>
                    </div>
                    <motion.span 
                      className="text-xl"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: index === selectedIndex ? 1 : 0, 
                        scale: index === selectedIndex ? 1 : 0.5,
                        rotate: index === selectedIndex ? 0 : -90
                      }}
                    >
                      +
                    </motion.span>
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
