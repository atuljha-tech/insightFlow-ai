'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Brain, Loader2, AlertCircle, CheckCircle, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatContext } from '@/lib/chatContext.client';
import { csvProcessorClient, DatasetInfo } from '@/lib/csvProcessor.client';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sql?: string;
  confidence?: number;
  data?: any[];
}

interface AIChatProps {
  onQueryResult: (data: any) => void;
  onDatasetLoaded?: (dataset: DatasetInfo & { tableName?: string }) => void;
}

// Toast style constant
const toastStyle = {
  borderRadius: '10px',
  background: '#1a1a1a',
  color: '#fff',
  border: '1px solid #333',
};

export default function AIChat({ onQueryResult, onDatasetLoaded }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: "👋 Welcome to AI Business Intelligence! I can help you analyze your data.\n\nTry these examples:\n• Upload a CSV file\n• Show me revenue by region\n• Compare sales trends\n• What are our top products?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState<(DatasetInfo & { tableName?: string }) | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Process follow-up with context
      const { enhancedQuery, context } = await chatContext.processFollowUp(input);
      
      console.log('Enhanced query:', enhancedQuery);
      console.log('Active table:', datasetInfo?.tableName || 'sales (default)');

      const response = await fetch('/api/ai-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: enhancedQuery,
          context: {
            dataset: datasetInfo?.fileName,
            previousContext: context,
            tableName: datasetInfo?.tableName
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to process query');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.query?.explanation || data.message || 'Here are your results',
        timestamp: new Date(),
        sql: data.query?.sql,
        confidence: data.query?.plan?.confidence || 0.8,
        data: data.data,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save to context
      chatContext.addMessage({
        role: 'assistant',
        content: data.query?.explanation || data.message,
        sql: data.query?.sql,
        data: data.data
      });

      // Pass data to parent
      onQueryResult({
        data: data.data,
        columns: data.columns,
        visualization: data.visualization,
        query: data.query,
        rawData: data.data,
      });

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `❌ Sorry, I couldn't process that. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Query failed', { style: toastStyle });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    
    // Add upload status message
    const uploadMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: `📤 Uploading ${file.name}...`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, uploadMessage]);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 Sending file:', file.name);

      // Make the API call
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ Upload result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // CRITICAL: Update chatContext with the new table name
      chatContext.setDatasetInfo({
        fileName: file.name,
        tableName: result.tableName
      });

      // Clear any old context and add system message about new table
      chatContext.clearSession();
      chatContext.addMessage({
        role: 'system',
        content: `New dataset loaded: ${file.name} with table ${result.tableName}`
      });

      // Update dataset info state with complete information
      const newDatasetInfo = {
        fileName: file.name,
        rowCount: result.stats.rowCount,
        columns: result.stats.columns.map((col: string) => ({ 
          name: col, 
          type: 'string', 
          sample: result.preview?.map((row: any) => row[col]).slice(0, 3) || [] 
        })),
        summary: {
          totalRows: result.stats.rowCount,
          totalColumns: result.stats.columnCount,
          numericColumns: result.stats.columnCount, // You can enhance this later
          categoricalColumns: 0,
          dateColumns: 0,
        },
        preview: result.preview || [],
        tableName: result.tableName
      };

      setDatasetInfo(newDatasetInfo);

      // Generate suggestions based on the data
      const columns = result.stats.columns || [];
      const numericColumns = columns.filter((col: string) => 
        result.preview?.some((row: any) => typeof row[col] === 'number')
      );
      const categoricalColumns = columns.filter((col: string) => 
        result.preview?.some((row: any) => typeof row[col] === 'string')
      );

      const newSuggestions = [];
      
      if (numericColumns.length > 0 && categoricalColumns.length > 0) {
        newSuggestions.push(`Show average ${numericColumns[0]} by ${categoricalColumns[0]}`);
        newSuggestions.push(`Show total ${numericColumns[0]} by ${categoricalColumns[0]}`);
      }
      if (numericColumns.length > 0) {
        newSuggestions.push(`What's the average ${numericColumns[0]}?`);
        newSuggestions.push(`What's the total ${numericColumns[0]}?`);
        newSuggestions.push(`Show me the highest ${numericColumns[0]}`);
      }
      if (categoricalColumns.length > 0) {
        newSuggestions.push(`Show me all ${categoricalColumns[0]} values`);
      }

      setSuggestions(newSuggestions.slice(0, 4));

      // Success message with clear table info
      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `✅ **Successfully loaded ${file.name}**\n\n` +
          `📊 **${result.stats.rowCount} rows** • **${result.stats.columnCount} columns**\n` +
          `📋 **Active table:** \`${result.tableName}\`\n\n` +
          `💡 **Try asking:**\n` +
          newSuggestions.slice(0, 3).map(s => `• ${s}`).join('\n'),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, successMessage]);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent
      onDatasetLoaded?.(newDatasetInfo);

      // Force a small delay to ensure context is updated, then show a test query option
      setTimeout(() => {
        const testMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'system',
          content: `✨ **Ready to analyze!** You can now ask questions about ${file.name}.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, testMessage]);
      }, 500);

      toast.success(`✅ ${file.name} loaded! Active table: ${result.tableName}`, {
        icon: '📊',
        style: toastStyle,
        duration: 5000,
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `❌ **Failed to load CSV**\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearChat = () => {
    chatContext.clearSession();
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: "👋 Session cleared. Start a new conversation!",
        timestamp: new Date(),
      },
    ]);
    setDatasetInfo(null);
    setSuggestions([]);
    toast.success('Chat cleared', {
      icon: '🧹',
      style: toastStyle,
    });
  };

  const applySuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-900/50 backdrop-blur rounded-2xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Assistant</h3>
            <p className="text-xs text-gray-400">
              {datasetInfo ? (
                <>
                  📊 {datasetInfo.fileName}
                  {datasetInfo.tableName && (
                    <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                      ACTIVE: {datasetInfo.tableName.split('_').pop()}
                    </span>
                  )}
                </>
              ) : (
                'Powered by Groq'
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors group relative"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Clear chat
            </span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors group relative"
            title="Upload CSV"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
            )}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Upload CSV
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-2",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-600">
                <Brain className="w-4 h-4 text-blue-400" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg",
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none'
                  : message.role === 'system'
                  ? 'bg-gray-800/90 text-gray-200 border border-gray-700/50 backdrop-blur-sm rounded-bl-none'
                  : 'bg-gray-800/90 text-gray-200 border border-gray-700/50 backdrop-blur-sm rounded-bl-none'
              )}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              
              {message.sql && (
                <div className="mt-3 p-3 bg-gray-900/80 rounded-xl border border-gray-700/50">
                  <p className="text-xs font-mono text-gray-400 mb-2">Generated SQL:</p>
                  <pre className="text-xs text-emerald-300 font-mono overflow-x-auto scrollbar-thin">
                    {message.sql}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                {message.confidence !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs",
                    message.confidence > 0.7 
                      ? "bg-green-400/10 text-green-400" 
                      : "bg-yellow-400/10 text-yellow-400"
                  )}>
                    {message.confidence > 0.7 ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    <span>{(message.confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                )}

                <span className="text-[10px] text-gray-500 ml-auto">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                <span className="text-white text-sm font-semibold">U</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-gray-600">
              <Brain className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl rounded-bl-none px-4 py-3 border border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                </div>
                <span className="text-sm text-gray-300">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800">
          <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <Brain className="w-3 h-3 text-purple-400" />
            Suggested questions for {datasetInfo?.fileName}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(suggestion)}
                className="group flex items-center gap-1 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-full text-xs text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 bg-gray-900/40 rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={datasetInfo ? `Ask about ${datasetInfo.fileName}...` : "Upload a CSV or ask a question..."}
            className="flex-1 bg-gray-800/80 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/50 transition-all"
            disabled={isLoading || uploading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || uploading}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 relative group",
              input.trim() && !isLoading && !uploading
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105"
                : "bg-gray-800/80 text-gray-500 cursor-not-allowed border border-gray-700/50"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}