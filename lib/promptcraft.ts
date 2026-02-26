/**
 * Prompt Craft 2.0 - Domain-Aware Prompting Engine
 * Supports Banking, Healthcare, Retail, Architecture domains
 * Multi-Model LLM Support with intelligent recommendations
 */

export type Domain = 'banking' | 'healthcare' | 'retail' | 'architecture' | 'general';
export type PromptStrategy = 'instruction' | 'chain-of-thought' | 'few-shot' | 'rag' | 'hybrid';
export type LLMCategory = 'fast' | 'balanced' | 'powerful' | 'specialized' | 'local';

export interface PromptTemplate {
  id: string;
  name: string;
  domain: Domain;
  description: string;
  strategies: PromptStrategy[];
  template: string;
  variables: string[];
  tags: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface LLMRecommendation {
  model: string;
  category: LLMCategory;
  reasoning: string;
  score: number; // 0-100
  costEstimate: string;
  speedRating: 'slow' | 'medium' | 'fast';
  qualityRating: 'basic' | 'good' | 'excellent';
}

export interface PromptRequest {
  domain: Domain;
  task: string;
  context?: string;
  strategy?: PromptStrategy;
  constraints?: string[];
}

export interface OptimizedPrompt {
  original: string;
  optimized: string;
  strategy: PromptStrategy;
  llmRecommendations: LLMRecommendation[];
  tips: string[];
  contextSuggestions?: string[];
}

// Domain-specific templates
const DOMAIN_TEMPLATES: Record<Domain, PromptTemplate[]> = {
  banking: [
    {
      id: 'banking-risk-analysis',
      name: 'Risk Assessment Analysis',
      domain: 'banking',
      description: 'Analyze financial risk factors and compliance requirements',
      strategies: ['chain-of-thought', 'few-shot'],
      template: `You are a banking risk analyst. Analyze the following scenario for compliance and risk:

Context: {{context}}

Risk Factors to Consider:
- Regulatory compliance (AML, KYC, Basel III)
- Credit risk assessment
- Market risk exposure
- Operational risk

Provide a structured analysis with:
1. Identified risks (High/Medium/Low)
2. Compliance gaps
3. Recommended mitigation strategies
4. Risk score (0-100)`,
      variables: ['context'],
      tags: ['compliance', 'risk', 'regulations'],
      complexity: 'complex',
    },
    {
      id: 'banking-fraud-detection',
      name: 'Fraud Detection Pattern Analysis',
      domain: 'banking',
      description: 'Identify potential fraud patterns in transaction data',
      strategies: ['instruction', 'few-shot'],
      template: `As a fraud analyst, examine this transaction pattern:

Transaction Data: {{data}}

Fraud Indicators to Check:
- Unusual velocity (frequency/amount spikes)
- Geographic inconsistencies
- Device fingerprint anomalies
- Behavioral deviation

Provide risk score and recommended action (allow/review/block)`,
      variables: ['data'],
      tags: ['fraud', 'security', 'detection'],
      complexity: 'moderate',
    },
  ],
  healthcare: [
    {
      id: 'healthcare-diagnosis-support',
      name: 'Clinical Decision Support',
      domain: 'healthcare',
      description: 'Assist with clinical decision-making and diagnosis support',
      strategies: ['chain-of-thought', 'few-shot'],
      template: `You are a medical decision support system. Analyze this clinical case:

Patient Profile: {{profile}}
Symptoms: {{symptoms}}
Test Results: {{results}}

Clinical Analysis Framework:
1. Differential diagnosis (list top 3-5)
2. Supporting evidence for each
3. Recommended additional tests
4. Treatment considerations
5. Contraindications to check

IMPORTANT: This is clinical support only. Always recommend human physician review.`,
      variables: ['profile', 'symptoms', 'results'],
      tags: ['clinical', 'diagnosis', 'medical'],
      complexity: 'complex',
    },
    {
      id: 'healthcare-patient-education',
      name: 'Patient Education Material',
      domain: 'healthcare',
      description: 'Create clear, accessible patient education content',
      strategies: ['instruction', 'few-shot'],
      template: `Create patient-friendly educational material about: {{condition}}

Requirements:
- Explain in simple, non-medical language
- Avoid jargon (use plain English)
- Include "What is this?", "Why does it happen?", "When to seek help?"
- Add 3 practical tips
- Target reading level: 8th grade

Format: Clear sections with headers`,
      variables: ['condition'],
      tags: ['education', 'patient-care', 'literacy'],
      complexity: 'simple',
    },
  ],
  retail: [
    {
      id: 'retail-customer-analysis',
      name: 'Customer Segmentation Analysis',
      domain: 'retail',
      description: 'Analyze customer behavior and segment for targeted marketing',
      strategies: ['instruction', 'few-shot', 'rag'],
      template: `As a retail analyst, segment this customer data:

Customer Data: {{data}}
Purchase History: {{history}}
Behavioral Metrics: {{metrics}}

Segmentation Framework:
1. Identify 4-5 distinct customer segments
2. For each segment:
   - Characteristics & behaviors
   - Purchase patterns
   - Price sensitivity
   - Growth potential
3. Recommended marketing strategies per segment
4. Churn risk indicators`,
      variables: ['data', 'history', 'metrics'],
      tags: ['marketing', 'analytics', 'segmentation'],
      complexity: 'moderate',
    },
    {
      id: 'retail-recommendation-engine',
      name: 'Product Recommendation Logic',
      domain: 'retail',
      description: 'Generate personalized product recommendations',
      strategies: ['instruction', 'few-shot'],
      template: `Create product recommendations for this customer:

Customer Profile: {{profile}}
Recent Purchases: {{purchases}}
Browsing History: {{browsing}}
Inventory: {{inventory}}

Recommendation Criteria:
- Complementary products (not just similar)
- Price alignment with customer segment
- Inventory availability
- Current trending items

Provide top 5 recommendations with reasoning`,
      variables: ['profile', 'purchases', 'browsing', 'inventory'],
      tags: ['recommendations', 'personalization', 'sales'],
      complexity: 'moderate',
    },
  ],
  architecture: [
    {
      id: 'arch-design-review',
      name: 'System Architecture Review',
      domain: 'architecture',
      description: 'Review system design for scalability and reliability',
      strategies: ['chain-of-thought', 'few-shot'],
      template: `Review this system architecture:

Current Design: {{design}}
Scale Requirements: {{scale}}
Constraints: {{constraints}}

Architecture Review Checklist:
1. Scalability analysis (horizontal/vertical)
2. Failure modes & recovery strategies
3. Data consistency approach
4. Security architecture
5. Cost optimization opportunities
6. Technology fit for requirements

Provide recommendations for each area`,
      variables: ['design', 'scale', 'constraints'],
      tags: ['systems', 'scalability', 'reliability'],
      complexity: 'complex',
    },
    {
      id: 'arch-migration-planning',
      name: 'System Migration Strategy',
      domain: 'architecture',
      description: 'Plan system migration with minimal disruption',
      strategies: ['instruction', 'chain-of-thought'],
      template: `Plan migration from {{source}} to {{target}}

Current State: {{current}}
Target State: {{target}}
Constraints: {{constraints}}

Migration Plan Should Include:
1. Phased approach (phases, timeline)
2. Data migration strategy
3. Rollback procedures
4. Risk assessment
5. Testing strategy
6. Stakeholder communication plan

Focus on minimal downtime and data safety`,
      variables: ['source', 'target', 'current', 'target', 'constraints'],
      tags: ['migration', 'planning', 'infrastructure'],
      complexity: 'complex',
    },
  ],
  general: [
    {
      id: 'general-analysis',
      name: 'General Analysis Framework',
      domain: 'general',
      description: 'General purpose analysis with structured thinking',
      strategies: ['chain-of-thought', 'instruction'],
      template: `Analyze the following question using structured thinking:

Question: {{question}}
Context: {{context}}

Analysis Framework:
1. Break down the question into components
2. Identify key assumptions
3. Consider multiple perspectives
4. Evaluate evidence for each perspective
5. Synthesize findings
6. Provide recommendations

Be thorough but concise.`,
      variables: ['question', 'context'],
      tags: ['analysis', 'thinking', 'reasoning'],
      complexity: 'moderate',
    },
  ],
};

// LLM Recommendation rules
const LLM_RECOMMENDATIONS: Record<string, LLMRecommendation> = {
  'claude-opus-4.6': {
    model: 'Claude Opus 4.6',
    category: 'powerful',
    reasoning: 'Best for complex reasoning, analysis, and long-context tasks',
    score: 95,
    costEstimate: '$15/M tokens',
    speedRating: 'medium',
    qualityRating: 'excellent',
  },
  'gemini-2.5-flash': {
    model: 'Gemini 2.5 Flash',
    category: 'balanced',
    reasoning: 'Fast, cost-effective for general tasks with good quality',
    score: 85,
    costEstimate: '$0.075/M tokens',
    speedRating: 'fast',
    qualityRating: 'good',
  },
  'gemini-2.0-flash': {
    model: 'Gemini 2.0 Flash',
    category: 'fast',
    reasoning: 'Ultra-fast for real-time applications and high-volume tasks',
    score: 78,
    costEstimate: '$0.05/M tokens',
    speedRating: 'fast',
    qualityRating: 'good',
  },
  'mistral-large': {
    model: 'Mistral Large',
    category: 'balanced',
    reasoning: 'Open-weight model for specialized use cases and on-premise',
    score: 80,
    costEstimate: 'Self-hosted',
    speedRating: 'medium',
    qualityRating: 'good',
  },
  'llama-2-70b': {
    model: 'LLaMA 2 70B',
    category: 'specialized',
    reasoning: 'Open-source for code and technical tasks',
    score: 75,
    costEstimate: 'Self-hosted',
    speedRating: 'slow',
    qualityRating: 'good',
  },
};

/**
 * Get templates for a specific domain
 */
export function getDomainTemplates(domain: Domain): PromptTemplate[] {
  return DOMAIN_TEMPLATES[domain] || [];
}

/**
 * Get all available templates
 */
export function getAllTemplates(): PromptTemplate[] {
  return Object.values(DOMAIN_TEMPLATES).flat();
}

/**
 * Recommend LLMs based on task characteristics
 */
export function recommendLLMs(
  complexity: 'simple' | 'moderate' | 'complex',
  strategy: PromptStrategy,
  needsSpeed: boolean
): LLMRecommendation[] {
  const recommendations: Array<[string, number]> = [];

  // Scoring logic based on task characteristics
  if (complexity === 'complex' && (strategy === 'chain-of-thought' || strategy === 'rag')) {
    recommendations.push(['claude-opus-4.6', 95]);
    recommendations.push(['gemini-2.5-flash', 82]);
    recommendations.push(['mistral-large', 80]);
  } else if (needsSpeed) {
    recommendations.push(['gemini-2.5-flash', 90]);
    recommendations.push(['gemini-2.0-flash', 88]);
    recommendations.push(['claude-opus-4.6', 70]);
  } else if (strategy === 'few-shot' || strategy === 'rag') {
    recommendations.push(['claude-opus-4.6', 92]);
    recommendations.push(['gemini-2.5-flash', 85]);
  } else {
    recommendations.push(['gemini-2.5-flash', 88]);
    recommendations.push(['claude-opus-4.6', 90]);
    recommendations.push(['mistral-large', 78]);
  }

  return recommendations
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([model, scoreBoost]) => {
      const base = LLM_RECOMMENDATIONS[model] || LLM_RECOMMENDATIONS['gemini-2.5-flash'];
      return {
        ...base,
        score: Math.min(100, base.score + (scoreBoost - base.score) * 0.5),
      };
    });
}

/**
 * Optimize a prompt using domain context and strategy
 */
export function optimizePrompt(request: PromptRequest): OptimizedPrompt {
  const templates = getDomainTemplates(request.domain);
  const strategy = request.strategy || 'instruction';
  const complexity = request.context ? 'complex' : 'simple';

  // Build optimized prompt
  let optimized = `[Domain: ${request.domain.toUpperCase()}] [Strategy: ${strategy.toUpperCase()}]\n\n`;

  if (strategy === 'chain-of-thought') {
    optimized += `Let's think through this step-by-step:\n\n`;
  } else if (strategy === 'few-shot') {
    optimized += `Here are some examples to illustrate the pattern:\n\n`;
  } else if (strategy === 'rag') {
    optimized += `Using the provided context and knowledge:\n\n`;
  }

  optimized += `Task: ${request.task}\n`;

  if (request.context) {
    optimized += `\nContext:\n${request.context}\n`;
  }

  if (request.constraints && request.constraints.length > 0) {
    optimized += `\nConstraints:\n${request.constraints.map((c) => `- ${c}`).join('\n')}\n`;
  }

  optimized += `\nProvide a thorough, structured response.`;

  // Generate tips based on strategy
  const tips: string[] = [];
  if (strategy === 'chain-of-thought') {
    tips.push('Break down complex problems into logical steps');
    tips.push('Show intermediate reasoning transparently');
    tips.push('Verify each step before proceeding');
  } else if (strategy === 'few-shot') {
    tips.push('Provide 2-3 clear examples before the main task');
    tips.push('Ensure examples follow consistent patterns');
    tips.push('Match example complexity to the main task');
  } else if (strategy === 'rag') {
    tips.push('Ensure context is relevant and well-structured');
    tips.push('Use proper document formatting for clarity');
    tips.push('Provide retrieval queries if using external sources');
  }

  tips.push(`This is a ${complexity} task in the ${request.domain} domain`);

  const recommendations = recommendLLMs(
    complexity as any,
    strategy,
    strategy === 'instruction'
  );

  return {
    original: request.task,
    optimized,
    strategy,
    llmRecommendations: recommendations,
    tips,
    contextSuggestions: generateContextSuggestions(request.domain),
  };
}

/**
 * Generate context suggestions for a domain
 */
function generateContextSuggestions(domain: Domain): string[] {
  const suggestions: Record<Domain, string[]> = {
    banking: [
      'Include regulatory framework (AML, KYC, GDPR)',
      'Specify transaction amounts and currencies',
      'Mention customer risk profile',
      'Include historical fraud patterns',
    ],
    healthcare: [
      'Provide patient demographics and medical history',
      'Include relevant lab values and ranges',
      'Specify clinical setting (primary care, specialist, ER)',
      'Note any medication interactions',
    ],
    retail: [
      'Include customer lifetime value and segment',
      'Specify inventory levels and turnover',
      'Mention seasonal trends and promotions',
      'Note competitive landscape',
    ],
    architecture: [
      'Define current technology stack and versions',
      'Specify scale requirements (users, data volume, QPS)',
      'Include compliance and security requirements',
      'Detail budget constraints',
    ],
    general: [
      'Provide relevant background information',
      'Clarify any ambiguous terms or concepts',
      'Include relevant constraints or limitations',
      'Specify desired output format',
    ],
  };

  return suggestions[domain] || suggestions.general;
}

/**
 * Validate a prompt for best practices
 */
export interface PromptValidation {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export function validatePrompt(prompt: string): PromptValidation {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check length
  if (prompt.length < 10) {
    issues.push('Prompt is too short');
    score -= 20;
  }
  if (prompt.length > 4000) {
    suggestions.push('Consider breaking down very long prompts into multiple tasks');
    score -= 5;
  }

  // Check for clarity
  if (!prompt.includes('?') && !prompt.includes(':')) {
    suggestions.push('Add a clear question or instruction');
    score -= 10;
  }

  // Check for structure
  const hasStructure =
    prompt.includes('\n') && (prompt.includes('-') || prompt.includes('1.'));
  if (!hasStructure) {
    suggestions.push('Use structured formatting (lists, sections) for clarity');
    score -= 15;
  }

  // Check for context
  if (prompt.toLowerCase().includes('analyze') && !prompt.includes('context')) {
    suggestions.push('Add context for analysis tasks');
    score -= 10;
  }

  return {
    isValid: issues.length === 0,
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}
