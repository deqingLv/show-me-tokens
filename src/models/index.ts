import { TokenSummary } from '../shared/types.js';

export function createTokenSummary(props: Partial<TokenSummary> = {}): TokenSummary {
  const summary: TokenSummary = {
    inputTokens: props.inputTokens ?? 0,
    outputTokens: props.outputTokens ?? 0,
    cacheReadInputTokens: props.cacheReadInputTokens ?? null,
    cacheCreationInputTokens: props.cacheCreationInputTokens ?? null,
    totalTokens: props.totalTokens ?? null,
  };
  recomputeTotal(summary);
  return summary;
}

export function recomputeTotal(tokens: TokenSummary): void {
  if (tokens.totalTokens !== null) {
    return;
  }
  const total = tokens.inputTokens + tokens.outputTokens;
  tokens.totalTokens = total > 0 ? total : null;
}
