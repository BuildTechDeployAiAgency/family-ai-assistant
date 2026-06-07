import {
  REFERENCE_DATE,
  INITIAL_EMAILS,
  MOCK_AI_RESPONSES,
  type ActionItem,
  type Deadline,
} from '@/data/fixtures';

export interface DocStatus {
  label: string;
  color: string;
  bg: string;
  icon: string;
  urgency: number; // 0 expired, 1 soon, 2 valid
}

export const getDaysDifference = (futureStr: string, baseStr: string): number => {
  const d1 = new Date(futureStr).getTime();
  const d2 = new Date(baseStr).getTime();
  return Math.ceil((d1 - d2) / (1000 * 60 * 60 * 24));
};

export const getDocumentStatus = (expiryDate: string): DocStatus => {
  const diff = getDaysDifference(expiryDate, REFERENCE_DATE);
  if (diff < 0) return { label: 'Expired', color: '#fb7185', bg: 'rgba(244,63,94,0.14)', icon: '🔴', urgency: 0 };
  if (diff <= 90) return { label: `Soon · ${diff}d`, color: '#fbbf24', bg: 'rgba(245,158,11,0.14)', icon: '🟡', urgency: 1 };
  return { label: 'Valid', color: '#34d399', bg: 'rgba(16,185,129,0.14)', icon: '🟢', urgency: 2 };
};

const URGENCY_RANK: Record<Deadline['urgency'], number> = { high: 0, medium: 1, low: 2 };

export const URGENCY_COLOR: Record<Deadline['urgency'], string> = {
  high: '#fb7185',
  medium: '#fbbf24',
  low: '#34d399',
};

export const formatDate = (str: string): string => {
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CATEGORY_COLORS: Record<string, string> = {
  Identity: '#6366f1',
  Driving: '#0ea5e9',
  Education: '#a855f7',
  Health: '#ef4444',
  Finance: '#10b981',
  Insurance: '#f59e0b',
  Sports: '#14b8a6',
  Travel: '#3b82f6',
  Admin: '#8b5cf6',
  Activities: '#ec4899',
};

export const categoryColor = (category: string): string =>
  CATEGORY_COLORS[category] ?? '#8fa3c0';

export interface AggregatedAction extends ActionItem {
  id: string;
  emailId: string;
  emailSubject: string;
  urgency: Deadline['urgency'];
}

// Flatten every AI action item across analyzed emails, sorted by deadline.
export const aggregateActions = (): AggregatedAction[] => {
  const out: AggregatedAction[] = [];
  for (const email of INITIAL_EMAILS) {
    const analysis = MOCK_AI_RESPONSES[email.id];
    if (!analysis) continue;
    analysis.actionItems.forEach((item, i) => {
      // borrow urgency from the matching/closest deadline, else medium
      const dl = analysis.deadlines.find((d) => d.date === item.deadline) ?? analysis.deadlines[0];
      out.push({
        ...item,
        id: `${email.id}-a${i}`,
        emailId: email.id,
        emailSubject: email.subject,
        urgency: dl?.urgency ?? 'medium',
      });
    });
  }
  return out.sort((a, b) => {
    const byUrg = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (byUrg !== 0) return byUrg;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
};
