import { SessionUsage, TokenCostEstimate } from '../shared/types.js';

export const HUGGING_FACE_PRICING_URL = 'https://huggingface.co/inference/models';

interface HuggingFacePriceRule {
  modelId: string;
  provider: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  patterns: RegExp[];
}

const PRICE_RULES: HuggingFacePriceRule[] = [
  {
    modelId: 'zai-org/GLM-5.1-FP8',
    provider: 'fireworks-ai',
    inputUsdPerMillion: 1.4,
    outputUsdPerMillion: 4.4,
    patterns: [/glm[-_ ]?5\.?1/i, /gm51/i],
  },
  {
    modelId: 'zai-org/GLM-5.2',
    provider: 'deepinfra',
    inputUsdPerMillion: 0.93,
    outputUsdPerMillion: 3.0,
    patterns: [/glm[-_ ]?5\.?2/i, /glm52/i],
  },
];

export function estimateHuggingFaceCostUsd(
  session: SessionUsage
): TokenCostEstimate | null {
  const modelName = session.modelName;
  if (!modelName) {
    return null;
  }

  const rule = PRICE_RULES.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(modelName))
  );
  if (!rule) {
    return null;
  }

  const inputUsd =
    (session.tokens.inputTokens / 1_000_000) * rule.inputUsdPerMillion;
  const outputUsd =
    (session.tokens.outputTokens / 1_000_000) * rule.outputUsdPerMillion;

  return {
    source: 'huggingface-inference-providers',
    pricingUrl: HUGGING_FACE_PRICING_URL,
    modelId: rule.modelId,
    provider: rule.provider,
    inputUsdPerMillion: rule.inputUsdPerMillion,
    outputUsdPerMillion: rule.outputUsdPerMillion,
    costUsd: inputUsd + outputUsd,
  };
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (value > 0 && value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(2)}`;
}
