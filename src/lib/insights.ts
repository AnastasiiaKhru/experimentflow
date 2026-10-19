import type { AppState, Experiment } from '../types.ts';
import { formatLift, formatNumber, formatPercent } from './format.ts';
import {
  callLabel,
  compareVariants,
  errorRate,
  participantsOf,
  type Comparison,
} from './stats.ts';

export type InsightTone = 'info' | 'positive' | 'warning' | 'critical';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  experimentId?: string;
}

function pair(state: AppState, experiment: Experiment) {
  return state.stats[experiment.id];
}

function comparisonFor(state: AppState, experiment: Experiment): Comparison {
  const stats = pair(state, experiment);
  return compareVariants(stats.A, stats.B);
}

export function buildInsights(state: AppState): Insight[] {
  const insights: Insight[] = [
    {
      id: 'simulated',
      tone: 'info',
      title: 'These are simulated insights',
      body: 'Rules run locally on the experiments stored in this browser. Nothing is sent to an AI service.',
    },
  ];

  const active = state.experiments.filter((experiment) => experiment.status !== 'archived');
  if (active.length === 0) {
    insights.push({
      id: 'empty',
      tone: 'warning',
      title: 'No active experiments',
      body: 'Create an experiment, start it, and run the event simulator before reading results.',
    });
    return insights;
  }

  const running = active.filter((experiment) => experiment.status === 'running');
  if (running.length === 0) {
    insights.push({
      id: 'none-running',
      tone: 'info',
      title: 'Nothing is collecting traffic',
      body: 'Every current experiment is paused, drafted, or archived. Resume one before expecting the charts to move.',
    });
  }

  for (const experiment of active) {
    const stats = pair(state, experiment);
    const comparison = comparisonFor(state, experiment);
    const people = participantsOf(stats);
    const errors = errorRate(stats.A, stats.B);
    const volume =
      people +
      stats.A.clicks +
      stats.B.clicks +
      stats.A.conversions +
      stats.B.conversions +
      stats.A.errors +
      stats.B.errors;

    if (people < 200 || stats.A.participants < 100 || stats.B.participants < 100) {
      insights.push({
        id: `${experiment.id}-sample`,
        tone: 'warning',
        title: `${experiment.name} has a small sample`,
        body: `${formatNumber(people)} participants so far (${formatNumber(stats.A.participants)} control, ${formatNumber(stats.B.participants)} treatment). Conversion gaps at this size are directional only.`,
        experimentId: experiment.id,
      });
    }

    if (volume >= 200 && errors >= 0.03) {
      insights.push({
        id: `${experiment.id}-errors`,
        tone: errors >= 0.08 && experiment.status === 'running' ? 'critical' : 'warning',
        title: `${experiment.name} is seeing processing errors`,
        body: `${formatPercent(errors)} of recorded events failed in the simulator. ${
          experiment.status === 'running'
            ? 'Pause the experiment if this rate keeps climbing.'
            : 'Keep it paused until the failure rate is understood.'
        }`,
        experimentId: experiment.id,
      });
    }

    if (comparison.call === 'leading-b') {
      insights.push({
        id: `${experiment.id}-lead-b`,
        tone: 'positive',
        title: `${experiment.name}: treatment is ahead`,
        body: `${experiment.variants.find((item) => item.key === 'B')?.name ?? 'Treatment'} converts at ${formatPercent(comparison.rateB)} versus ${formatPercent(comparison.rateA)} for control (${formatLift(comparison.lift)}). The 95% intervals do not overlap. Review the goal “${experiment.goal}” before a rollout.`,
        experimentId: experiment.id,
      });
    } else if (comparison.call === 'leading-a') {
      insights.push({
        id: `${experiment.id}-lead-a`,
        tone: experiment.status === 'running' ? 'critical' : 'warning',
        title:
          experiment.status === 'running'
            ? `Pause ${experiment.name}`
            : `Keep ${experiment.name} paused`,
        body: `Control converts at ${formatPercent(comparison.rateA)} and treatment at ${formatPercent(comparison.rateB)}. The intervals separate, and treatment is behind on “${experiment.goal}”.`,
        experimentId: experiment.id,
      });
    } else if (comparison.call === 'inconclusive' && people >= 200) {
      insights.push({
        id: `${experiment.id}-inconclusive`,
        tone: 'info',
        title: `${experiment.name} has no clear winner`,
        body: `Control is ${formatPercent(comparison.rateA)} and treatment is ${formatPercent(comparison.rateB)}. The uncertainty intervals still overlap, so this is not a ship decision.`,
        experimentId: experiment.id,
      });
    }

    const lowTraffic = experiment.variants.find((item) => item.trafficPercent < 10);
    if (lowTraffic && experiment.status !== 'archived') {
      insights.push({
        id: `${experiment.id}-traffic`,
        tone: 'warning',
        title: `${experiment.name} splits traffic unevenly`,
        body: `${lowTraffic.name} receives ${lowTraffic.trafficPercent}% of assignments. That will keep its sample small.`,
        experimentId: experiment.id,
      });
    }
  }

  if (!insights.some((insight) => insight.tone === 'critical')) {
    const held = active.find(
      (experiment) =>
        experiment.status === 'paused' && comparisonFor(state, experiment).call === 'leading-a',
    );
    insights.push({
      id: 'no-pause',
      tone: 'positive',
      title: 'No running experiment needs an emergency pause',
      body: held
        ? `${held.name} is already paused because treatment is trailing control.`
        : running.length
          ? 'The running tests are either ahead on treatment or still too early to call.'
          : 'Start a draft when you are ready to collect simulated traffic.',
    });
  }

  return insights;
}

function listExperiments(state: AppState): string {
  return state.experiments
    .map((experiment) => {
      const stats = pair(state, experiment);
      const comparison = comparisonFor(state, experiment);
      return `${experiment.name} (${experiment.status}): ${formatNumber(participantsOf(stats))} participants, control ${formatPercent(comparison.rateA)}, treatment ${formatPercent(comparison.rateB)}, ${callLabel(comparison.call).toLowerCase()}.`;
    })
    .join(' ');
}

export function answerQuestion(question: string, state: AppState): string {
  const q = question.toLowerCase();
  const closer = ' This answer is a local rule check on simulated data, not a production decision.';

  if (q.includes('pause') || q.includes('problem') || q.includes('stop') || q.includes('regress')) {
    const pauses = buildInsights(state).filter(
      (insight) => insight.title.startsWith('Pause') || insight.title.startsWith('Keep'),
    );
    if (pauses.length === 0) {
      return `No experiment currently meets the pause rule. A pause is suggested when treatment is behind with at least 200 people per variant and non-overlapping intervals, or when the simulated error rate reaches 8%.${closer}`;
    }
    return `${pauses.map((insight) => `${insight.title}. ${insight.body}`).join(' ')}${closer}`;
  }

  if (q.includes('winner') || q.includes('leading') || q.includes('ship') || q.includes('which')) {
    const lines = state.experiments.map((experiment) => {
      const comparison = comparisonFor(state, experiment);
      if (comparison.call === 'needs-data') {
        return `${experiment.name} does not have enough data to name a leader.`;
      }
      if (comparison.call === 'inconclusive') {
        return `${experiment.name} is inconclusive at ${formatPercent(comparison.rateA)} vs ${formatPercent(comparison.rateB)}.`;
      }
      const leader = comparison.call === 'leading-b' ? 'Treatment' : 'Control';
      return `${experiment.name}: ${leader} is leading, ${formatPercent(comparison.rateB)} treatment vs ${formatPercent(comparison.rateA)} control.`;
    });
    return `${lines.join(' ')} A leader is only named when both variants have 200 or more participants and the 95% Wilson intervals do not overlap.${closer}`;
  }

  if (q.includes('sample') || q.includes('significant') || q.includes('enough') || q.includes('uncertainty')) {
    const lines = state.experiments.map((experiment) => {
      const stats = pair(state, experiment);
      const enough = stats.A.participants >= 200 && stats.B.participants >= 200;
      return `${experiment.name} has ${formatNumber(stats.A.participants)} control and ${formatNumber(stats.B.participants)} treatment participants. ${
        enough ? 'That clears the local sample bar.' : 'That is still a small sample.'
      }`;
    });
    return `${lines.join(' ')} Uncertainty is a 95% Wilson interval and is hidden until a variant has 30 participants. Intervals that overlap mean the gap could be noise.${closer}`;
  }

  if (
    q.includes('conversion') ||
    q.includes('metric') ||
    q.includes('explain') ||
    q.includes('what is') ||
    q.includes('how')
  ) {
    return `Conversion rate is conversions divided by unique participants. A participant is one assignment. Clicks can repeat and are not the primary goal. Each user can convert once, so the simulator does not double-count a goal. Lift is the relative change from control (A) to treatment (B). Events processed includes assignments, clicks, conversions, and simulated errors.${closer}`;
  }

  if (q.includes('error') || q.includes('latency') || q.includes('reliab')) {
    const errors = state.events.filter((event) => event.kind === 'error').length;
    return `The recent event log has ${errors} simulated errors in the last ${state.events.length} stored events. All-time counters live on each variant. Latency in the log is generated with the event and is not measured from a network.${closer}`;
  }

  return `${listExperiments(state)} Ask about a winner, sample size, pause recommendation, or what a metric means.${closer}`;
}
