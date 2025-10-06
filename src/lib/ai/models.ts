/**
 * Available AI models for newsletter generation
 */

export interface AIModel {
  id: string;
  name: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'claude-opus-4-0',
    name: 'Claude 4 Opus',
    description: 'Most capable model - highest quality reasoning and analysis'
  },
  {
    id: 'claude-sonnet-4-0', 
    name: 'Claude 4 Sonnet',
    description: 'Balanced performance and speed for most tasks'
  },
  {
    id: 'claude-3-7-sonnet-latest',
    name: 'Claude 3.7 Sonnet (Latest)',
    description: 'Enhanced version with improved capabilities'
  },
  {
    id: 'claude-3-5-sonnet-latest',
    name: 'Claude 3.5 Sonnet (Latest)',
    description: 'Reliable and fast - good balance of quality and speed'
  },
  {
    id: 'claude-3-5-haiku-latest',
    name: 'Claude 3.5 Haiku (Latest)', 
    description: 'Fastest model - best for simple tasks and quick responses'
  }
];

export const DEFAULT_AI_MODEL = 'claude-sonnet-4-0';

/**
 * Get model name by ID
 */
export function getModelName(modelId: string): string {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model?.name || modelId;
}

/**
 * Get model description by ID
 */
export function getModelDescription(modelId: string): string {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model?.description || '';
}