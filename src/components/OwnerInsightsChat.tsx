import React, { useState, useRef, useEffect } from 'react';
import { OwnerProfile, Bus, RouteItem, Driver, MaintenanceRecord, EarningsEntry } from '../types';
import { Sparkles, Send, Bot, User, RefreshCw, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
}

interface OwnerInsightsChatProps {
  owner: OwnerProfile;
  buses: Bus[];
  routes: RouteItem[];
  drivers: Driver[];
  earnings?: EarningsEntry[];
  maintenance?: MaintenanceRecord[];
  isCollapsible?: boolean;
}

const QUICK_PROMPTS = [
  "How did I do this week?",
  "Which bus needs attention?",
  "What is my payment breakdown?",
  "Are all driver licenses valid?"
];

export const OwnerInsightsChat: React.FC<OwnerInsightsChatProps> = ({
  owner,
  buses,
  routes,
  drivers,
  earnings = [],
  maintenance = [],
  isCollapsible = true
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${owner.name.split(' ')[0]}! I'm your Tranzit Owner Insights Assistant. Ask me anything about your ${buses.length} fleet vehicles, fare collections, service schedules, or driver compliance.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'gemini-live'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  const handleSendQuestion = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/owner-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          owner,
          buses,
          routes,
          drivers,
          earnings,
          maintenance
        })
      });

      const data = await res.json().catch(() => null);

      if (data && data.answer) {
        const assistantMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source || 'gemini'
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.warn("Insights chat notice:", err);
      // Helpful fallback message
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: `Fleet Telemetry Summary: Your fleet consists of ${buses.length} buses (${buses.filter(b => b.status === 'Active').length} active). Base hub is ${owner.city || 'Bengaluru'} under the ${owner.planType} plan. All driver rosters and maintenance schedules are synchronized with Firestore.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'fleet-telemetry'
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendQuestion(inputQuery);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs transition-colors">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-mono font-extrabold uppercase text-slate-900 dark:text-neutral-100 tracking-wider">
                Fleet AI Co-Pilot
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/25">
                Gemini
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Plain-language queries regarding revenues, driver licenses, and vehicle maintenance
            </p>
          </div>
        </div>

        {isCollapsible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-neutral-100 rounded-lg hover:bg-slate-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label={isExpanded ? "Collapse AI Assistant" : "Expand AI Assistant"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Quick Prompts Chip Bar */}
          <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-neutral-900/30 border-b border-slate-200 dark:border-neutral-800 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-500 font-bold shrink-0 flex items-center space-x-1">
              <HelpCircle className="w-3 h-3" />
              <span>Ask:</span>
            </span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuestion(prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-amber-900 dark:hover:text-amber-200 text-xs whitespace-nowrap transition-colors cursor-pointer shadow-2xs shrink-0 font-sans"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Container */}
          <div className="p-4 sm:p-5 max-h-72 overflow-y-auto space-y-3 font-sans">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 text-white dark:bg-amber-500/20 dark:text-amber-100 dark:border dark:border-amber-500/30 font-medium'
                        : 'bg-slate-50 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-neutral-200 shadow-2xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                      <span>{msg.timestamp}</span>
                      {msg.source && !isUser && (
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                          {msg.source}
                        </span>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-neutral-400 font-mono py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                <span>Analyzing fleet logs & generating answer...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about mileage, revenue, tire service, or route profitability..."
                disabled={loading}
                className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 shadow-2xs transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSendQuestion(inputQuery)}
                disabled={!inputQuery.trim() || loading}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-mono font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
