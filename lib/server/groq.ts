import Groq from 'groq-sdk';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

class GroqServerClient {
  private client: Groq;
  private initialized: boolean = false;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ GROQ_API_KEY is not set in environment variables');
      this.client = new Groq({ apiKey: 'dummy-key' });
      this.initialized = false;
    } else {
      this.client = new Groq({ apiKey });
      this.initialized = true;
    }
  }

  async complete(
    messages: GroqMessage[],
    options: GroqOptions = {}
  ): Promise<string | null> {
    if (!this.initialized) {
      console.warn('Groq client not initialized - returning fallback response');
      return this.getFallbackResponse(messages);
    }

    try {
      // Use a supported model - llama3-70b or llama3-8b are currently available
      const model = 'llama-3.3-70b-versatile' // Updated from deprecated model
      
      console.log(`🤖 Using Groq model: ${model}`);
      
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens || 500,
      });

      return completion.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('Groq API error:', error);
      return this.getFallbackResponse(messages);
    }
  }

  private getFallbackResponse(messages: GroqMessage[]): string | null {
    // Simple rule-based fallback for when API fails
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    if (lastMessage.includes('top 3 products')) {
      return 'SELECT product, SUM(revenue) as total_revenue FROM sales GROUP BY product ORDER BY total_revenue DESC LIMIT 3';
    }
    
    if (lastMessage.includes('revenue by region')) {
      return 'SELECT region, SUM(revenue) as total_revenue FROM sales GROUP BY region ORDER BY total_revenue DESC';
    }
    
    if (lastMessage.includes('revenue by category')) {
      return 'SELECT category, SUM(revenue) as total_revenue FROM sales GROUP BY category ORDER BY total_revenue DESC';
    }
    
    if (lastMessage.includes('monthly') || lastMessage.includes('trend')) {
      return "SELECT substr(date,1,7) as month, SUM(revenue) as total_revenue FROM sales GROUP BY month ORDER BY month";
    }
    
    return 'SELECT * FROM sales LIMIT 10';
  }

  isReady(): boolean {
    return this.initialized;
  }
}

export const groqServerClient = new GroqServerClient();