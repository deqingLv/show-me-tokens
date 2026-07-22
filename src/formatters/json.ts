import { SessionUsage } from '../shared/types.js';
import { usageToDict } from './shared.js';

export function formatJson(sessions: SessionUsage[]): string {
  return JSON.stringify(sessions.map(usageToDict), null, 2);
}
