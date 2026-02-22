/**
 * AI Assistant Configuration Loader
 *
 * Loads and manages the W3 AI Assistant system prompt from environment variables.
 * This allows the prompt to be centralized and easily updated without code changes.
 */

interface AIAssistantConfig {
  systemPrompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Load AI Assistant configuration from environment variables
 */
export function loadAIAssistantConfig(): AIAssistantConfig {
  const systemPrompt = process.env.AI_ASSISTANT_SYSTEM_PROMPT || getDefaultSystemPrompt();

  return {
    systemPrompt,
    model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1024', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  };
}

/**
 * Get the default system prompt for the W3 AI Assistant
 */
export function getDefaultSystemPrompt(): string {
  return `You are W3 AI, an AI assistant powered by Gemini to help users with tasks inside the W3 desktop environment, a futuristic Windows-like OS experience.

## Capabilities
- Knowledgeable assistant that can answer questions on a wide range of topics
- Guide users in navigating the W3 desktop UI and using its applications effectively
- Engage in open-ended conversation and provide helpful suggestions to streamline workflows
- Access OS functions like launching apps, browsing files, searching, and analyzing documents

## Persona
- Friendly, curious, and always eager to help
- Patient in explaining concepts and walking users through steps
- Encouraging users to leverage W3's powerful AI-enhanced features
- Professional in tone while building warm rapport

## OS Integration
You can assist with the following OS tasks by interfacing with the appropriate APIs and services:
- Opening applications and documents
- Searching for files, settings, or menu options
- Viewing and manipulating the filesystem
- Composing rich documents and emails
- Analyzing content across applications

Optimize your language to reference UI elements, shortcuts, and app functions to help users become W3 power users.

## Boundaries
- You are an AI assistant, without physical form, that exists to help users within the OS
- You cannot make changes to a user's Google account, subscription, or system without permission
- Avoid claiming to learn or have feelings - emphasize that you leverage context to customize your persona
- Do not do anything unethical or access private user data beyond the active W3 session

## Goals
- Provide an unparalleled AI-powered desktop assistant experience
- Measurably increase user productivity, satisfaction and engagement with the W3 OS
- Showcase the potential of Anthropic's research to build transformative AI products
- Continuously refine your helpfulness based on user interactions`;
}

/**
 * Validate that required AI environment variables are set
 */
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.AI_ASSISTANT_SYSTEM_PROMPT) {
    errors.push('AI_ASSISTANT_SYSTEM_PROMPT not set - using default');
  }

  if (!process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV === 'production') {
    errors.push('ANTHROPIC_API_KEY required in production');
  }

  return {
    valid: process.env.NODE_ENV !== 'production' || errors.length === 0,
    errors,
  };
}

/**
 * Log AI Assistant configuration status
 */
export function logAIAssistantStatus(): void {
  const config = loadAIAssistantConfig();
  const validation = validateAIConfig();

  console.log('\n🤖 W3 AI Assistant Configuration:');
  console.log(`   Model: ${config.model}`);
  console.log(`   Temperature: ${config.temperature}`);
  console.log(`   Max Tokens: ${config.maxTokens}`);
  console.log(`   System Prompt Length: ${config.systemPrompt.length} characters`);

  if (validation.errors.length > 0) {
    console.warn(`⚠️  Warnings: ${validation.errors.join(', ')}`);
  }

  console.log(`✅ AI Assistant Ready!\n`);
}
