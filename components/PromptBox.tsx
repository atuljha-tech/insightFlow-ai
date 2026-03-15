'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, Upload, Mic, Paperclip, 
  X, Loader2, Zap, TrendingUp, BarChart3, 
  PieChart, Calendar, DollarSign, Users,
  Command, Globe, ChevronRight, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptBoxProps {
  onSend: (query: string) => void;
  onFileUpload: (file: File) => void;
  isLoading?: boolean;
}

export default function PromptBox({ onSend, onFileUpload, isLoading }: PromptBoxProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSend(query);
      setQuery('');
      setShowSuggestions(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setUploadedFile(file);
    setUploadProgress(0);
    
    // Use a ref to track if component is mounted
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Move onFileUpload to a useEffect or ensure it's called after render
          setTimeout(() => onFileUpload(file), 0);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }
};

  const clearUpload = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault();
      onSend(suggestions[selectedSuggestion].text);
      setQuery('');
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    }
  };

  const suggestions = [
    { 
      text: 'Show me revenue trends', 
      icon: TrendingUp, 
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      category: 'Revenue'
    },
    { 
      text: 'Compare profits by month', 
      icon: BarChart3, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      category: 'Profit'
    },
    { 
      text: 'Top performing months', 
      icon: Calendar, 
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      category: 'Performance'
    },
    { 
      text: 'Customer growth analysis', 
      icon: Users, 
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      category: 'Customers'
    },
    { 
      text: 'Quarterly sales forecast', 
      icon: DollarSign, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      category: 'Forecast'
    },
    { 
      text: 'Market share distribution', 
      icon: PieChart, 
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      category: 'Market'
    },
  ];

  const filteredSuggestions = query.trim() 
    ? suggestions.filter(s => 
        s.text.toLowerCase().includes(query.toLowerCase())
      )
    : suggestions;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative group">
        {/* Animated gradient background */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-75 group-hover:opacity-100 blur-xl transition duration-1000 group-hover:duration-200 animate-gradient-xy"></div>
        
        {/* Main input container */}
        <div className={cn(
          "relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border transition-all duration-300",
          isFocused 
            ? "border-blue-500/50 shadow-lg shadow-blue-500/20" 
            : "border-gray-800 hover:border-gray-700"
        )}>
          {/* Upload progress bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="absolute -top-1 left-0 right-0 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Uploaded file indicator */}
          {uploadedFile && uploadProgress === 100 && (
            <div className="absolute -top-12 left-4 right-4 bg-gray-800/90 backdrop-blur rounded-xl border border-gray-700 p-2 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500/20 rounded-lg">
                    <Zap className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-300 truncate max-w-[200px]">
                    {uploadedFile.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={clearUpload}
                  className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}

          <div className="relative flex items-center px-4">
            {/* AI Icon with pulse effect */}
            <div className="relative mr-3">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md animate-pulse" />
              <div className="relative p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            
            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedSuggestion(-1);
              }}
              onFocus={() => {
                setIsFocused(true);
                setShowSuggestions(true);
              }}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your business data..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none py-5 text-lg"
              disabled={isLoading}
            />
            
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Command hint */}
              {!query && !isLoading && (
                <div className="hidden md:flex items-center gap-1 mr-2 text-xs text-gray-500">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              )}

              {/* Mic button */}
              <button
                type="button"
                className="p-2 hover:bg-gray-800 rounded-xl transition-colors group/mic"
                title="Voice input"
              >
                <Mic className="w-5 h-5 text-gray-400 group-hover/mic:text-purple-400 transition-colors" />
              </button>

              {/* File upload button */}
              <label className="cursor-pointer p-2 hover:bg-gray-800 rounded-xl transition-colors group/upload relative">
                <Paperclip className="w-5 h-5 text-gray-400 group-hover/upload:text-blue-400 transition-colors" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {/* Tooltip */}
                <span className="absolute -bottom-8 right-0 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover/upload:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Upload CSV or Excel
                </span>
              </label>
              
              {/* Send button */}
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200 relative group/send",
                  query.trim() && !isLoading
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-blue-500/25"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {/* Tooltip */}
                    <span className="absolute -bottom-8 right-0 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover/send:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Send message
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && !isLoading && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700 shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200"
            >
              {/* Header */}
              <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Suggested queries
                </span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  AI-powered
                </span>
              </div>

              {/* Suggestions list */}
              <div className="max-h-64 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.text}
                      onClick={() => {
                        onSend(suggestion.text);
                        setQuery('');
                        setShowSuggestions(false);
                      }}
                      onMouseEnter={() => setSelectedSuggestion(index)}
                      className={cn(
                        "w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700/50 transition-colors text-left group/suggestion",
                        selectedSuggestion === index && "bg-gray-700/50"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", suggestion.bg)}>
                        <Icon className={cn("w-4 h-4", suggestion.color)} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{suggestion.text}</p>
                        <p className="text-xs text-gray-500">{suggestion.category}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 opacity-0 group-hover/suggestion:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
                <span>ESC to close</span>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 justify-center items-center">
        <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
          <Zap className="w-3 h-3" />
          Try:
        </span>
        {suggestions.slice(0, 4).map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.text}
              onClick={() => {
                onSend(suggestion.text);
                setQuery('');
              }}
              disabled={isLoading}
              className="group relative px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 rounded-full text-sm border border-gray-700 transition-all hover:scale-105 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 flex items-center gap-2"
            >
              <Icon className={cn("w-3.5 h-3.5", suggestion.color)} />
              <span>{suggestion.text}</span>
              {/* Tooltip */}
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Click to ask
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick stats bar */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3" />
          <span>Powered by AI</span>
        </div>
        <div className="w-1 h-1 bg-gray-700 rounded-full" />
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>Real-time analysis</span>
        </div>
        <div className="w-1 h-1 bg-gray-700 rounded-full" />
        <div className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          <span>Smart insights</span>
        </div>
      </div>
    </div>
  );
}