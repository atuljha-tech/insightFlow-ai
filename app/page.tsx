'use client';

import { useState, useEffect } from 'react';
import PromptBox from '@/components/PromptBox';
import Dashboard from '@/components/Dashboard';
import AIChat from '@/components/AIChat';
import { 
  BarChart2, Sparkles, ArrowRight, Database, 
  Users, CheckCircle2, Upload, MessageSquare, 
  Brain, Menu, X, Github, Twitter, Linkedin 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';

type DashboardState = any;

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardState | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSend = async (query: string) => {
    setIsLoading(true);
    toast.loading('AI is analyzing your query...', { id: 'query' });
    
    setTimeout(() => {
      toast.success('Dashboard updated with insights!', { id: 'query' });
      setIsLoading(false);
      setHasData(true);
    }, 2000);
  };

  const handleFileUpload = (file: File) => {
    toast.loading('Processing your data...', { id: 'upload' });
    
    setTimeout(() => {
      toast.success(`Successfully loaded ${file.name}!`, { id: 'upload' });
      setHasData(true);
    }, 1500);
  };

  const handleAIQueryResult = (data: any) => {
    setDashboardData(data);
    setHasData(true);
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0F] antialiased">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#111118',
            color: '#fff',
            border: '1px solid #1F2937',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          duration: 3000,
        }}
      />
      
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#6366F1]/3 via-transparent to-[#8B5CF6]/3 pointer-events-none" />
      
      {/* Grid pattern */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none" />

      <div className="relative z-10 font-sans">
        {/* Header */}
        <header className="border-b border-[#1F2937] bg-[#0A0A0F]/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-lg">
                  <BarChart2 className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-white tracking-tight">InsightFlow</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium bg-[#1F2937] text-[#9CA3AF] rounded-full">
                  Beta
                </span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                <a href="#" className="text-xs text-[#9CA3AF] hover:text-white transition-colors">Features</a>
                <a href="#" className="text-xs text-[#9CA3AF] hover:text-white transition-colors">Pricing</a>
                <a href="#" className="text-xs text-[#9CA3AF] hover:text-white transition-colors">Documentation</a>
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-4">
                <button className="hidden sm:block text-xs text-[#9CA3AF] hover:text-white transition-colors">
                  Sign in
                </button>
                
                <button className="px-4 py-1.5 bg-[#6366F1] text-white rounded-lg text-xs font-medium hover:bg-[#4F46E5] transition-colors">
                  Get started
                </button>

                {/* Mobile menu button */}
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1.5 hover:bg-[#1F2937] rounded-lg transition-colors"
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" strokeWidth={1.5} /> : <Menu className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[#1F2937] bg-[#0A0A0F]">
              <div className="max-w-7xl mx-auto px-6 py-4">
                <nav className="flex flex-col gap-4">
                  <a href="#" className="text-sm text-[#9CA3AF] hover:text-white py-2">Features</a>
                  <a href="#" className="text-sm text-[#9CA3AF] hover:text-white py-2">Pricing</a>
                  <a href="#" className="text-sm text-[#9CA3AF] hover:text-white py-2">Documentation</a>
                  <div className="pt-2 border-t border-[#1F2937]">
                    <button className="text-sm text-[#9CA3AF] hover:text-white">Sign in</button>
                  </div>
                </nav>
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">
          {/* Hero - Only when no data */}
          {!hasData && (
            <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F2937] mb-8">
                <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" strokeWidth={1.5} />
                <span className="text-xs text-[#9CA3AF]">AI-powered analytics</span>
              </div>
              
              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-light text-white mb-6 tracking-tight">
                Turn your data into
                <span className="block font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] mt-2">
                  intelligent insights
                </span>
              </h1>
              
              <p className="text-sm text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                Upload any CSV and ask questions in plain English. 
                Get instant visualizations and AI-powered observations.
              </p>

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#6366F1]" strokeWidth={1.5} />
                  <span className="text-xs text-[#6B7280]">10K+ users</span>
                </div>
                <span className="text-[#1F2937]">/</span>
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-[#8B5CF6]" strokeWidth={1.5} />
                  <span className="text-xs text-[#6B7280]">1M+ queries</span>
                </div>
                <span className="text-[#1F2937]">/</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#EC4899]" strokeWidth={1.5} />
                  <span className="text-xs text-[#6B7280]">99.9% accuracy</span>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Box */}
          <div className="max-w-2xl mx-auto">
            <PromptBox 
              onSend={handleSend} 
              onFileUpload={handleFileUpload}
              isLoading={isLoading}
            />
          </div>

          {/* Main Content Area */}
          {hasData ? (
            <div className="mt-8 md:mt-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chat */}
                <div className="lg:col-span-1">
                  <AIChat onQueryResult={handleAIQueryResult} />
                </div>
                
                {/* Dashboard */}
                <div className="lg:col-span-2">
                  <Dashboard data={dashboardData} />
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="mt-16 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#111118] border border-[#1F2937] mb-4">
                <Upload className="w-5 h-5 text-[#6366F1]" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">No data loaded</h3>
              <p className="text-xs text-[#6B7280] mb-5">Upload a CSV or ask a question to begin</p>
              
              {/* Quick tips */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#111118] rounded-md border border-[#1F2937]">
                  <Upload className="w-3 h-3 text-[#6366F1]" strokeWidth={1.5} />
                  <span className="text-xs text-[#9CA3AF]">Upload</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[#1F2937]" strokeWidth={1} />
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#111118] rounded-md border border-[#1F2937]">
                  <MessageSquare className="w-3 h-3 text-[#8B5CF6]" strokeWidth={1.5} />
                  <span className="text-xs text-[#9CA3AF]">Ask</span>
                </div>
                <ArrowRight className="w-3 h-3 text-[#1F2937]" strokeWidth={1} />
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#111118] rounded-md border border-[#1F2937]">
                  <Brain className="w-3 h-3 text-[#EC4899]" strokeWidth={1.5} />
                  <span className="text-xs text-[#9CA3AF]">Get insights</span>
                </div>
              </div>
            </div>
          )}

          {/* Features - Minimal grid */}
          {!hasData && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                'Real-time analysis',
                'Smart visualizations',
                'AI observations',
                'Export as PNG/PDF',
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="text-center p-3 rounded-lg bg-[#111118] border border-[#1F2937]"
                >
                  <span className="text-xs text-[#9CA3AF]">{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-[#1F2937] mt-16 bg-[#0A0A0F]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#6B7280] order-2 md:order-1">
                © 2024 InsightFlow. All rights reserved.
              </p>
              
              <div className="flex items-center gap-6 order-1 md:order-2">
                <a href="#" className="text-xs text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
                  Privacy
                </a>
                <a href="#" className="text-xs text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
                  Terms
                </a>
                <div className="flex items-center gap-3 ml-2">
                  <a href="#" className="p-1.5 hover:bg-[#1F2937] rounded-lg transition-colors">
                    <Github className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.5} />
                  </a>
                  <a href="#" className="p-1.5 hover:bg-[#1F2937] rounded-lg transition-colors">
                    <Twitter className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.5} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}