export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sql?: string;
  data?: any[];
  insights?: any[];
  confidence?: number;
}
export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  context: {
    lastQuery?: string;
    lastSQL?: string;
    lastData?: any[];
    lastFilters?: any[];
    lastDimensions?: string[];
    lastMetrics?: string[];
    tableName?: string;
    lastTableName?: string;  // Add this line
    datasetInfo?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

class ChatContextClient {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;

  constructor() {
    // Initialize with a default session
    this.createSession();
    
    // Try to load from localStorage on client side only
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Create a new chat session
   */
  createSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    
    // Save to localStorage
    this.saveToStorage();
    
    return sessionId;
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChatSession | null {
    if (!this.currentSessionId) {
      this.createSession();
    }
    return this.sessions.get(this.currentSessionId!) || null;
  }

  /**
   * Add message to session
   */
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const session = this.getCurrentSession();
    if (!session) throw new Error('No active session');

    const fullMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date()
    };

    session.messages.push(fullMessage);
    session.updatedAt = new Date();

    // Update context based on message
    if (message.role === 'assistant' && message.data && message.data.length > 0) {
      session.context.lastData = message.data;
      session.context.lastSQL = message.sql;
      
      // Try to extract dimensions and metrics from data
      try {
        const sampleRow = message.data[0];
        const columns = Object.keys(sampleRow);
        
        // Guess dimensions (string columns) and metrics (number columns)
        const dimensions = columns.filter(col => 
          typeof sampleRow[col] === 'string' && 
          !col.toLowerCase().includes('date') &&
          !col.toLowerCase().includes('time') &&
          !col.toLowerCase().includes('id')
        );
        
        const metrics = columns.filter(col => 
          typeof sampleRow[col] === 'number'
        );
        
        session.context.lastDimensions = dimensions.slice(0, 3);
        session.context.lastMetrics = metrics.slice(0, 3);
      } catch (error) {
        console.error('Error extracting dimensions:', error);
      }
    }

    // Update last query if it's a user message
    if (message.role === 'user') {
      session.context.lastQuery = message.content;
    }

    // Save to localStorage
    this.saveToStorage();

    return fullMessage;
  }

  /**
   * Set dataset information
   */
 // In lib/chatContext.client.ts
/**
 * Set dataset information
 */
setDatasetInfo(datasetInfo: any): void {
  const session = this.getCurrentSession();
  if (session) {
    session.context.datasetInfo = datasetInfo;
    session.context.tableName = datasetInfo.tableName || 'uploaded_data';
    // Store the raw table name separately for queries
    session.context.lastTableName = datasetInfo.tableName;
    console.log('📌 ChatContext: Active table set to', datasetInfo.tableName);
    this.saveToStorage();
  }
}

/**
 * Get the current table name
 */
getCurrentTableName(): string | null {
  const session = this.getCurrentSession();
  return session?.context?.tableName || session?.context?.lastTableName || null;
}
  /**
   * Process follow-up query with context (client-side only, no AI)
   */
  processFollowUp(newQuery: string): {
    enhancedQuery: string;
    context: any;
    isFollowUp: boolean;
  } {
    const session = this.getCurrentSession();
    if (!session || session.messages.length === 0) {
      return { enhancedQuery: newQuery, context: {}, isFollowUp: false };
    }

    try {
      // Get last few messages for context
      const lastMessages = session.messages.slice(-5);
      const lastUserMessage = [...session.messages]
        .reverse()
        .find(m => m.role === 'user');

      // Detect if this is a follow-up
      const isFollowUp = this.detectFollowUp(newQuery, lastMessages);

      if (!isFollowUp) {
        return { 
          enhancedQuery: newQuery, 
          context: {
            ...session.context,
            previousQuery: lastUserMessage?.content
          },
          isFollowUp: false
        };
      }

      // Simple client-side enhancement (without AI)
      const enhancedQuery = this.simpleEnhanceQuery(newQuery, session.context);

      return {
        enhancedQuery,
        context: {
          ...session.context,
          previousQuery: lastUserMessage?.content,
          previousSQL: session.context.lastSQL
        },
        isFollowUp: true
      };
    } catch (error) {
      console.error('Follow-up processing failed:', error);
      return { enhancedQuery: newQuery, context: session.context, isFollowUp: false };
    }
  }

  /**
   * Simple rule-based query enhancement (no AI)
   */
  private simpleEnhanceQuery(query: string, context: any): string {
    const queryLower = query.toLowerCase();
    let enhanced = query;

    // Handle "only show X" pattern
    const onlyMatch = queryLower.match(/only\s+show\s+(\w+)/i);
    if (onlyMatch && context.lastDimensions?.length > 0) {
      const value = onlyMatch[1];
      const dimension = context.lastDimensions[0];
      enhanced = `${context.lastQuery || 'Show data'} where ${dimension} = '${value}'`;
    }

    // Handle "filter by X" pattern
    const filterMatch = queryLower.match(/filter\s+by\s+(\w+)/i);
    if (filterMatch && context.lastDimensions?.length > 0) {
      const value = filterMatch[1];
      const dimension = context.lastDimensions[0];
      enhanced = `${context.lastQuery || 'Show data'} filtered by ${dimension} = '${value}'`;
    }

    // Handle "compare with X" pattern
    if (queryLower.includes('compare') && context.lastMetrics?.length > 0) {
      enhanced = `Compare ${context.lastMetrics.join(' and ')} ${query.replace(/compare/i, '').trim()}`;
    }

    // Handle "trend" pattern
    if (queryLower.includes('trend') && context.lastMetrics?.length > 0) {
      enhanced = `Show monthly trend of ${context.lastMetrics[0]}`;
    }

    return enhanced;
  }

  /**
   * Detect if query is a follow-up
   */
  private detectFollowUp(query: string, lastMessages: ChatMessage[]): boolean {
    const followUpIndicators = [
      'it', 'they', 'them', 'that', 'those',
      'now', 'then', 'also', 'only', 'just',
      'filter', 'show me', 'what about', 'how about',
      'and', 'but', 'however', 'meanwhile'
    ];

    const queryLower = query.toLowerCase();
    
    // Check for very short queries (likely follow-ups)
    if (query.split(' ').length < 3) return true;
    
    // Check for follow-up indicators at the start
    const firstWord = queryLower.split(' ')[0];
    if (followUpIndicators.includes(firstWord)) return true;
    
    // Check for any follow-up indicators
    if (followUpIndicators.some(indicator => queryLower.includes(indicator))) {
      return true;
    }

    // Check for references to previous results
    if (lastMessages.length > 0) {
      const lastUserQuery = lastMessages
        .filter(m => m.role === 'user')
        .pop()?.content.toLowerCase() || '';
      
      // If query shares key nouns with previous
      const lastNouns = lastUserQuery.split(' ').filter(word => 
        word.length > 3 && !['show', 'tell', 'give', 'what', 'how', 'why'].includes(word)
      );
      
      const currentWords = new Set(queryLower.split(' '));
      const commonWords = lastNouns.filter(word => currentWords.has(word));
      
      if (commonWords.length > 0) return true;
    }

    return false;
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const session = this.getCurrentSession();
      if (session) {
        // Don't store the entire message history in localStorage to avoid size limits
        const storageData = {
          id: session.id,
          context: session.context,
          messageCount: session.messages.length,
          lastMessage: session.messages[session.messages.length - 1]
        };
        localStorage.setItem('chatSession', JSON.stringify(storageData));
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('chatSession');
      if (saved) {
        const data = JSON.parse(saved);
        // We don't restore full messages, just context
        const session = this.getCurrentSession();
        if (session) {
          session.context = data.context || {};
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }

  /**
   * Get relevant context for a new query
   */
  getRelevantContext(): any {
    const session = this.getCurrentSession();
    if (!session) return {};

    return {
      lastSQL: session.context.lastSQL,
      lastDimensions: session.context.lastDimensions,
      lastMetrics: session.context.lastMetrics,
      lastQuery: session.context.lastQuery,
      tableName: session.context.tableName || 'sales',
      datasetInfo: session.context.datasetInfo
    };
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.currentSessionId = null;
    this.createSession();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chatSession');
    }
  }

  /**
   * Get chat history for display
   */
  getChatHistory(): ChatMessage[] {
    const session = this.getCurrentSession();
    return session?.messages || [];
  }

  /**
   * Get last user query
   */
  getLastUserQuery(): string | null {
    const session = this.getCurrentSession();
    if (!session) return null;
    
    const lastUserMessage = [...session.messages]
      .reverse()
      .find(m => m.role === 'user');
    
    return lastUserMessage?.content || null;
  }

  /**
   * Get last assistant response
   */
  getLastResponse(): string | null {
    const session = this.getCurrentSession();
    if (!session) return null;
    
    const lastAssistantMessage = [...session.messages]
      .reverse()
      .find(m => m.role === 'assistant');
    
    return lastAssistantMessage?.content || null;
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(): string {
    const session = this.getCurrentSession();
    if (!session || session.messages.length === 0) {
      return 'No conversation yet';
    }

    const userMessages = session.messages.filter(m => m.role === 'user');
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');
    
    return `${userMessages.length} questions asked, ${assistantMessages.length} responses generated`;
  }

  /**
   * Export chat history
   */
  exportChatHistory(): ChatMessage[] {
    const session = this.getCurrentSession();
    return session?.messages || [];
  }
}

// Export singleton instance
export const chatContext = new ChatContextClient();