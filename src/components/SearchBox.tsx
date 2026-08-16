import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchRecord } from '../types'
import { searchRecords } from '../lib/search'

interface SearchBoxProps {
  records: SearchRecord[]
  onSelect: (record: SearchRecord) => void
}

export function SearchBox({ records, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => searchRecords(records, query), [records, query])
  const showResults = focused && query.trim().length > 0

  useEffect(() => setActiveIndex(0), [query])

  const choose = (record: SearchRecord) => {
    setQuery(record.historicalName)
    setFocused(false)
    onSelect(record)
    inputRef.current?.blur()
  }

  return (
    <div className="search-shell" role="search">
      <div className={`search-control ${focused ? 'is-focused' : ''}`}>
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => Math.max(index - 1, 0))
            }
            if (event.key === 'Enter' && results[activeIndex]) {
              event.preventDefault()
              choose(results[activeIndex])
            }
            if (event.key === 'Escape') {
              setQuery('')
              inputRef.current?.blur()
            }
          }}
          placeholder="搜索今名或旧名，如：南昌路 / Vallon"
          aria-label="搜索现代或历史地名"
          aria-expanded={showResults}
          aria-controls="search-results"
          aria-activedescendant={showResults ? `search-result-${activeIndex}` : undefined}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="icon-button search-clear"
            aria-label="清空搜索"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {showResults && (
        <div id="search-results" className="search-results" role="listbox">
          {results.length ? (
            results.map((record, index) => (
              <button
                id={`search-result-${index}`}
                key={record.featureGroupId}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`search-result ${index === activeIndex ? 'is-active' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(record)}
              >
                <span className="search-result-old">{record.historicalName}</span>
                <span className="search-result-now">
                  今名 · {record.modernNameZh}
                  {record.modernNameEn ? ` / ${record.modernNameEn}` : ''}
                </span>
              </button>
            ))
          ) : (
            <div className="search-empty">没有找到对应的历史地名</div>
          )}
        </div>
      )}
    </div>
  )
}
