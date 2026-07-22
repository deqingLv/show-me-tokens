import { SessionFilters, SessionUsage } from '../shared/types.js';

export abstract class AgentAdapter {
  abstract readonly name: string;
  abstract defaultDbPath(): string;
  abstract collectSessions(dbPath: string, filters: SessionFilters): SessionUsage[];
}
