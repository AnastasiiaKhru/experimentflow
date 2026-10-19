import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNav } from '../components/navigation.tsx';
import { btnPrimary, btnSecondary, card, field } from '../components/ui.ts';
import { answerQuestion, buildInsights, type InsightTone } from '../lib/insights.ts';
import { useStore } from '../store/store.tsx';

const prompts = [
  'Which experiment should I pause?',
  'Is there a winning variant?',
  'Where is the sample size too small?',
  'Explain conversion rate',
];

const toneClass: Record<InsightTone, string> = {
  info: 'border-[#d3e4f5] bg-[#f8fbfe]',
  positive: 'border-[#c8e6c9] bg-[#f5fbf6]',
  warning: 'border-[#f3e2a8] bg-[#fffbf2]',
  critical: 'border-[#f1c0c4] bg-[#fdf7f8]',
};

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export function AssistantPage() {
  const { state, selectExperiment } = useStore();
  const { navigate } = useNav();
  const insights = buildInsights(state);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'I read the experiments stored in this browser. Ask which test to pause, whether a variant is leading, or what a metric means.',
    },
  ]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: 'user', text: trimmed },
      { role: 'assistant', text: answerQuestion(trimmed, state) },
    ]);
    setDraft('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-[#dddcf6] bg-[#f7f7fd] px-4 py-3 text-sm text-[#3b3a8f]">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Simulated AI insights. These notes are deterministic rules over local metrics. No model API is called.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          {insights.map((insight) => (
            <article key={insight.id} className={`rounded-xl border px-4 py-3 ${toneClass[insight.tone]}`}>
              <h2 className="text-sm font-semibold">{insight.title}</h2>
              <p className="mt-1 text-sm leading-6 text-[#323130]">{insight.body}</p>
              {insight.experimentId && (
                <button
                  type="button"
                  className={`${btnSecondary} mt-3`}
                  onClick={() => {
                    selectExperiment(insight.experimentId!);
                    navigate('analytics');
                  }}
                >
                  View analytics
                </button>
              )}
            </article>
          ))}
        </section>

        <section className={`${card} flex min-h-[480px] flex-col`}>
          <header className="border-b border-[#f0f1f3] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Ask about this workspace</h2>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[95%] rounded-lg px-3 py-2 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'ml-auto bg-[#0f6cbd] text-white'
                    : 'bg-[#f4f6f8] text-[#201f1e]'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 px-5 pb-2">
            {prompts.map((prompt) => (
              <button key={prompt} type="button" className={btnSecondary} onClick={() => ask(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-[#f0f1f3] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
          >
            <input
              className={field}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about lift, errors, or sample size"
              aria-label="Question"
            />
            <button type="submit" className={btnPrimary}>
              Ask
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
