/**
 * Prompt Craft 2.0 - Industry-Aware Prompting Engine with 20 Advanced Types
 * Supports Gemini AI-powered prompt generation across multiple industries
 */

export type Industry =
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'tech'
  | 'retail'
  | 'marketing'
  | 'manufacturing'
  | 'hr'
  | 'logistics'
  | 'legal'
  | 'customer-service'
  | 'project-management'
  | 'research'
  | 'it'
  | 'sales'
  | 'consulting'
  | 'journalism'
  | 'non-profit'
  | 'engineering'
  | 'policy-making';

export type PromptType =
  | 'instruction-based'
  | 'chain-of-thought'
  | 'few-shot'
  | 'rag'
  | 'tree-of-thoughts'
  | 'graph-of-thought'
  | 'logical-chain'
  | 'self-consistency'
  | 'chain-of-symbol'
  | 'chain-of-verification'
  | 'emotion-prompting'
  | 'skeleton-of-thought'
  | 'art'
  | 'instruction-tuning'
  | 'ape'
  | 'system-2-attention'
  | 'react'
  | 'structured-chain'
  | 'chain-of-knowledge'
  | 'chain-of-code';

export interface PromptTemplate {
  id: string;
  name: string;
  type: PromptType;
  industry: Industry;
  description: string;
  template: string;
  variables: string[];
  tags: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface LLMRecommendation {
  model: string;
  reasoning: string;
  score: number;
  costEstimate: string;
  speedRating: 'slow' | 'medium' | 'fast';
  qualityRating: 'basic' | 'good' | 'excellent';
}

export interface PromptRequest {
  industry: Industry;
  promptType: PromptType;
  task: string;
  context?: string;
  constraints?: string[];
}

export interface GeneratedPrompt {
  prompt: string;
  promptType: PromptType;
  industry: Industry;
  tokenEstimate: number;
  tips: string[];
}

// Prompt type descriptions and templates
const PROMPT_TYPES: Record<PromptType, { name: string; description: string }> = {
  'instruction-based': {
    name: 'Instruction-Based',
    description: 'Direct task instructions with clear expectations',
  },
  'chain-of-thought': {
    name: 'Chain-of-Thought',
    description: 'Step-by-step reasoning to solve complex problems',
  },
  'few-shot': {
    name: 'Few-Shot',
    description: 'Learn from 2-3 examples to follow patterns',
  },
  rag: {
    name: 'RAG',
    description: 'Leverage external knowledge and documents',
  },
  'tree-of-thoughts': {
    name: 'Tree-of-Thoughts',
    description: 'Explore multiple reasoning branches simultaneously',
  },
  'graph-of-thought': {
    name: 'Graph-of-Thought',
    description: 'Map relationships and connections between concepts',
  },
  'logical-chain': {
    name: 'Logical Chain-of-Thought',
    description: 'Use formal logic and deductive reasoning',
  },
  'self-consistency': {
    name: 'Self-Consistency',
    description: 'Generate multiple outputs and find consensus',
  },
  'chain-of-symbol': {
    name: 'Chain-of-Symbol',
    description: 'Use symbolic notation and mathematical reasoning',
  },
  'chain-of-verification': {
    name: 'Chain-of-Verification',
    description: 'Verify each step and validate conclusions',
  },
  'emotion-prompting': {
    name: 'Emotion Prompting',
    description: 'Appeal to motivations and emotional context',
  },
  'skeleton-of-thought': {
    name: 'Skeleton-of-Thought',
    description: 'Create structured outlines before detailed output',
  },
  art: {
    name: 'ART (Automatic Reasoning & Tool-use)',
    description: 'Combine reasoning with tool invocation',
  },
  'instruction-tuning': {
    name: 'Instruction Prompting & Tuning',
    description: 'Fine-tuned instructions with parameter optimization',
  },
  ape: {
    name: 'APE (Automatic Prompt Engineer)',
    description: 'Let AI optimize and evolve the prompt',
  },
  'system-2-attention': {
    name: 'System 2 Attention Prompting',
    description: 'Encourage slow, deliberate thinking',
  },
  react: {
    name: 'ReAct',
    description: 'Reasoning + Acting + Observing cycle',
  },
  'structured-chain': {
    name: 'Structured Chain-of-Thought',
    description: 'Formatted step-by-step reasoning with XML/JSON',
  },
  'chain-of-knowledge': {
    name: 'Chain-of-Knowledge',
    description: 'Build knowledge progressively from facts',
  },
  'chain-of-code': {
    name: 'Chain-of-Code',
    description: 'Use code generation as intermediate steps',
  },
};

// Industry-specific guidance
const INDUSTRY_CONTEXT: Record<Industry, string> = {
  finance: 'Focus on regulatory compliance, risk assessment, and financial accuracy',
  healthcare: 'Emphasize patient safety, clinical evidence, and medical accuracy disclaimers',
  education: 'Target learning objectives, pedagogical approaches, and student outcomes',
  tech: 'Consider scalability, performance, security, and technical depth',
  retail: 'Focus on customer experience, conversion optimization, and inventory management',
  marketing: 'Emphasize audience segmentation, engagement metrics, and brand voice',
  manufacturing: 'Consider supply chain, quality control, and production efficiency',
  hr: 'Focus on compliance, employee engagement, and organizational culture',
  logistics: 'Consider optimization, tracking, and delivery efficiency',
  legal: 'Emphasize regulatory compliance, risk mitigation, and liability',
  'customer-service': 'Focus on customer satisfaction, resolution time, and empathy',
  'project-management': 'Consider timelines, resources, scope, and stakeholder management',
  research: 'Emphasize methodology, peer review, and scientific rigor',
  it: 'Focus on infrastructure, security, disaster recovery, and uptime',
  sales: 'Emphasize objection handling, value proposition, and deal closure',
  consulting: 'Focus on strategic recommendations, ROI, and business impact',
  journalism: 'Emphasize accuracy, multiple sources, and journalistic ethics',
  'non-profit': 'Focus on mission alignment, impact measurement, and stakeholder engagement',
  engineering: 'Consider system design, performance metrics, and technical constraints',
  'policy-making': 'Emphasize stakeholder impact, data-driven decisions, and public interest',
};

// Domain-specific templates for each prompt type
const TEMPLATE_EXAMPLES: Record<PromptType, Record<Industry, string>> = {
  'instruction-based': {
    finance: 'Analyze the following financial transaction for compliance with AML/KYC regulations.',
    healthcare: 'Summarize the patient medical record following HIPAA privacy guidelines.',
    education: 'Design a learning activity that addresses the following educational objective.',
    tech: 'Propose a technical solution that meets these performance requirements.',
    retail: 'Create a customer engagement strategy for the identified segment.',
    marketing: 'Develop a marketing campaign message for this target audience.',
    manufacturing: 'Optimize the production process given these constraints.',
    hr: 'Create an onboarding plan for a new employee in this role.',
    logistics: 'Plan the most efficient delivery route considering these factors.',
    legal: 'Review this contract for potential legal risks and compliance issues.',
    'customer-service': 'Craft a response to this customer issue that resolves their concern.',
    'project-management': 'Create a project plan with timeline and resource allocation.',
    research: 'Design a research methodology to test this hypothesis.',
    it: 'Propose an IT infrastructure solution with disaster recovery plan.',
    sales: 'Develop a sales pitch addressing the prospect\'s key concerns.',
    consulting: 'Provide strategic recommendations to improve business performance.',
    journalism: 'Verify the accuracy of this story using multiple sources.',
    'non-profit': 'Create a fundraising strategy aligned with our mission.',
    engineering: 'Design a system component that meets these specifications.',
    'policy-making': 'Develop a policy recommendation with impact analysis.',
  },
  'chain-of-thought': {
    finance:
      'Let me think through this step-by-step: First, identify the risk factors. Second, evaluate regulatory requirements. Third, assess mitigation strategies.',
    healthcare:
      'Breaking this down: 1) Evaluate symptoms and patient history 2) Consider differential diagnoses 3) Recommend diagnostic tests 4) Plan treatment approach',
    education:
      'Let me work through this: 1) Define learning outcome 2) Identify prerequisite knowledge 3) Design instructional sequence 4) Assess mastery',
    tech: 'Step-by-step: 1) Understand requirements 2) Identify constraints 3) Evaluate options 4) Propose solution with tradeoffs',
    retail:
      'Breaking it down: 1) Analyze customer segments 2) Identify patterns 3) Determine strategy 4) Project outcomes',
    marketing:
      'Let\'s think: 1) Define target audience 2) Understand motivations 3) Craft messaging 4) Choose channels',
    manufacturing:
      'Step-by-step: 1) Map current process 2) Identify bottlenecks 3) Test improvements 4) Measure impact',
    hr: 'Breaking it down: 1) Assess role requirements 2) Plan onboarding stages 3) Set success metrics 4) Prepare materials',
    logistics:
      'Let\'s work through: 1) Map all locations 2) Analyze constraints 3) Optimize routes 4) Validate solution',
    legal:
      'Step-by-step: 1) Identify key terms 2) Flag risks 3) Research precedents 4) Recommend actions',
    'customer-service':
      'Let\'s think: 1) Understand the problem 2) Acknowledge feelings 3) Offer solutions 4) Follow up',
    'project-management':
      'Breaking down: 1) Define scope 2) List deliverables 3) Estimate timeline 4) Allocate resources',
    research: 'Step-by-step: 1) State hypothesis 2) Design experiment 3) Plan analysis 4) Address limitations',
    it: 'Let\'s think: 1) Assess current infrastructure 2) Identify risks 3) Propose redundancy 4) Test failover',
    sales: 'Breaking it down: 1) Understand prospect 2) Identify pain points 3) Present value 4) Address objections',
    consulting:
      'Step-by-step: 1) Analyze situation 2) Identify opportunities 3) Develop scenarios 4) Recommend path forward',
    journalism:
      'Let\'s verify: 1) Check primary sources 2) Seek multiple perspectives 3) Fact-check claims 4) Disclose limitations',
    'non-profit':
      'Breaking down: 1) Clarify mission impact 2) Identify supporters 3) Plan strategy 4) Measure outcomes',
    engineering:
      'Step-by-step: 1) Define requirements 2) Sketch design 3) Calculate performance 4) Plan testing',
    'policy-making':
      'Let\'s think: 1) Identify stakeholders 2) Analyze data 3) Model outcomes 4) Recommend approach',
  },
  'few-shot': {
    finance:
      'Example 1: [High risk] suspicious unusual transfer patterns → Flag for review. Example 2: [Low risk] routine payroll transaction → Approve. Now analyze this transaction.',
    healthcare:
      'Example 1: Fever + cough + negative flu test → Consider pneumonia. Example 2: Chest pain + clear lungs → Consider cardiac causes. Now assess this case.',
    education:
      'Example 1: Clear objectives → Students can design projects. Example 2: Vague goals → Student confusion. Design this activity.',
    tech: 'Example 1: High traffic requirement → Horizontal scaling. Example 2: Complex logic → Microservices. Design for this need.',
    retail:
      'Example 1: High-value customer → Premium service. Example 2: New customer → Welcome offer. Treat this customer segment.',
    marketing:
      'Example 1: Young tech-savvy → Social media focus. Example 2: Established business → LinkedIn focus. Market to this audience.',
    manufacturing:
      'Example 1: Manual bottleneck → Automate. Example 2: Quality issues → Train. Improve this process.',
    hr: 'Example 1: Senior role → Executive coaching plan. Example 2: Entry role → Structured mentoring. Plan onboarding for this role.',
    logistics:
      'Example 1: Urban delivery → bike couriers. Example 2: Long distance → consolidation. Route for these locations.',
    legal:
      'Example 1: Ambiguous liability clause → Flag and revise. Example 2: Fair terms → Approve. Review this clause.',
    'customer-service':
      'Example 1: Upset customer → Empathize, offer solution. Example 2: Satisfied customer → Thank you, maintain. Respond to this customer.',
    'project-management':
      'Example 1: Complex project → Phased approach. Example 2: Simple task → Direct execution. Plan this work.',
    research:
      'Example 1: Novel question → Qualitative study. Example 2: Validated question → Quantitative test. Design for this question.',
    it: 'Example 1: Critical system → Triple redundancy. Example 2: Non-critical → Basic backup. Design for this system.',
    sales: 'Example 1: Price-sensitive → ROI focus. Example 2: Quality-focused → Feature benefits. Pitch to this prospect.',
    consulting:
      'Example 1: Stagnant growth → Diversification. Example 2: Market shift → Pivot strategy. Advise on this situation.',
    journalism:
      'Example 1: Controversial claim → Multiple sources required. Example 2: Verified fact → Single credible source ok. Verify this story.',
    'non-profit':
      'Example 1: Donor fatigue → Peer-to-peer fundraising. Example 2: Growing base → Major gifts program. Strategy for this stage.',
    engineering:
      'Example 1: Real-time requirement → Low-latency design. Example 2: Batch processing → High-throughput design. Design for this.',
    'policy-making':
      'Example 1: Conflicting interests → Stakeholder mapping. Example 2: Aligned interests → Coalition building. Address this issue.',
  },
  rag: {
    finance:
      'Using regulatory documentation, case law, and enforcement precedents: Evaluate compliance for this transaction.',
    healthcare:
      'Using clinical guidelines, research articles, and practice standards: Recommend treatment approach.',
    education:
      'Using curriculum standards, learning science research, and best practices: Design instruction.',
    tech: 'Using architecture patterns, performance benchmarks, and design docs: Propose solution.',
    retail:
      'Using customer data, market trends, and competitive analysis: Create strategy.',
    marketing:
      'Using audience insights, campaign analytics, and market research: Develop campaign.',
    manufacturing:
      'Using process data, quality metrics, and industry standards: Optimize production.',
    hr: 'Using company policies, role descriptions, and training materials: Plan development.',
    logistics:
      'Using map data, traffic patterns, and historical performance: Plan delivery.',
    legal: 'Using contract templates, precedent cases, and regulations: Review agreement.',
    'customer-service':
      'Using knowledge base, similar cases, and best practices: Resolve issue.',
    'project-management':
      'Using project templates, historical data, and lessons learned: Plan project.',
    research:
      'Using literature review, methodology texts, and ethical guidelines: Design study.',
    it: 'Using infrastructure docs, incident reports, and best practices: Design systems.',
    sales: 'Using CRM data, objection handling guides, and case studies: Close deal.',
    consulting:
      'Using industry reports, case studies, and best practices: Recommend strategy.',
    journalism:
      'Using news archives, databases, and expert interviews: Verify story.',
    'non-profit': 'Using program data, donor profiles, and impact reports: Plan fundraising.',
    engineering: 'Using design docs, performance data, and test results: Design component.',
    'policy-making':
      'Using policy briefs, data reports, and stakeholder feedback: Develop policy.',
  },
  'tree-of-thoughts': {
    finance: 'Branch 1: Conservative approach. Branch 2: Moderate approach. Branch 3: Aggressive approach. Evaluate this decision.',
    healthcare:
      'Branch 1: Diagnostic pathway A. Branch 2: Diagnostic pathway B. Branch 3: Urgent intervention. Decide on approach.',
    education:
      'Branch 1: Teacher-led instruction. Branch 2: Student-centered learning. Branch 3: Hybrid model. Design for this goal.',
    tech: 'Branch 1: Monolithic. Branch 2: Microservices. Branch 3: Serverless. Choose architecture.',
    retail:
      'Branch 1: Premium positioning. Branch 2: Value positioning. Branch 3: Mass market. Plan positioning.',
    marketing:
      'Branch 1: Brand awareness. Branch 2: Conversion focus. Branch 3: Retention emphasis. Choose strategy.',
    manufacturing:
      'Branch 1: Automation. Branch 2: Human optimization. Branch 3: Hybrid. Plan improvement.',
    hr: 'Branch 1: Autocratic approach. Branch 2: Collaborative approach. Branch 3: Autonomous teams. Choose culture.',
    logistics:
      'Branch 1: Hub-and-spoke. Branch 2: Direct delivery. Branch 3: Cross-dock. Choose model.',
    legal:
      'Branch 1: Aggressive negotiation. Branch 2: Collaborative approach. Branch 3: Litigation ready. Choose strategy.',
    'customer-service':
      'Branch 1: Self-service. Branch 2: Agent-assisted. Branch 3: Escalation path. Design support.',
    'project-management':
      'Branch 1: Waterfall. Branch 2: Agile. Branch 3: Hybrid. Choose methodology.',
    research:
      'Branch 1: Experimental design. Branch 2: Observational study. Branch 3: Mixed methods. Choose approach.',
    it: 'Branch 1: Cloud. Branch 2: On-premise. Branch 3: Hybrid cloud. Choose infrastructure.',
    sales: 'Branch 1: Enterprise sales. Branch 2: Self-serve. Branch 3: Channel partners. Choose model.',
    consulting:
      'Branch 1: Quick wins. Branch 2: Long-term transformation. Branch 3: Strategic shift. Recommend approach.',
    journalism:
      'Branch 1: Investigative focus. Branch 2: Breaking news. Branch 3: Analysis pieces. Choose editorial line.',
    'non-profit':
      'Branch 1: Donor base. Branch 2: Grants. Branch 3: Social enterprise. Choose revenue model.',
    engineering:
      'Branch 1: Scale-first. Branch 2: Quality-first. Branch 3: Feature-first. Prioritize for this.',
    'policy-making':
      'Branch 1: Regulation approach. Branch 2: Incentive approach. Branch 3: Education approach. Choose mechanism.',
  },
  'graph-of-thought': {
    finance: 'Connect: Regulatory requirements → Risk assessment → Mitigation strategies. Map relationships.',
    healthcare:
      'Connect: Symptoms → Differential diagnoses → Tests → Treatment. Map clinical connections.',
    education:
      'Connect: Learning goals → Content knowledge → Assessment → Instruction. Map relationships.',
    tech: 'Connect: Requirements → Components → Dependencies → Infrastructure. Map architecture.',
    retail:
      'Connect: Customer segments → Behaviors → Strategies → Outcomes. Map relationships.',
    marketing:
      'Connect: Audience → Motivations → Messaging → Channels → Results. Map campaign flow.',
    manufacturing:
      'Connect: Inputs → Processes → Quality → Costs → Output. Map process chain.',
    hr: 'Connect: Role requirements → Skills needed → Development paths → Career growth. Map progression.',
    logistics:
      'Connect: Origins → Distribution centers → Routes → Destinations → Delivery. Map network.',
    legal:
      'Connect: Parties → Obligations → Dispute mechanisms → Remedies → Enforcement. Map relationships.',
    'customer-service':
      'Connect: Issue type → Solution path → Resources needed → Follow-up → Satisfaction. Map flow.',
    'project-management':
      'Connect: Scope → Tasks → Resources → Timeline → Risks → Outcomes. Map dependencies.',
    research:
      'Connect: Question → Hypothesis → Design → Methods → Analysis → Conclusions. Map flow.',
    it: 'Connect: Assets → Threats → Vulnerabilities → Mitigations → Monitoring. Map security.',
    sales: 'Connect: Lead → Needs → Solutions → Value → Objections → Close. Map sales process.',
    consulting:
      'Connect: Problem → Analysis → Opportunities → Recommendations → Implementation → ROI. Map engagement.',
    journalism:
      'Connect: Story idea → Research → Interviews → Verification → Narrative → Publication. Map process.',
    'non-profit':
      'Connect: Mission → Programs → Impact → Donors → Funding → Growth. Map relationships.',
    engineering:
      'Connect: Requirements → Design → Implementation → Testing → Deployment → Monitoring. Map lifecycle.',
    'policy-making':
      'Connect: Problem → Stakeholders → Options → Analysis → Recommendation → Implementation. Map policy process.',
  },
  'logical-chain': {
    finance:
      'Premise 1: All high-velocity transactions are at risk. Premise 2: This is high-velocity. Conclusion: This is at risk.',
    healthcare:
      'Premise 1: Symptoms match condition A. Premise 2: Tests confirm condition A. Conclusion: Diagnose condition A.',
    education:
      'Premise 1: Objective requires critical thinking. Premise 2: This activity develops critical thinking. Conclusion: Use this activity.',
    tech: 'Premise 1: System needs low latency. Premise 2: Cache reduces latency. Conclusion: Implement caching.',
    retail:
      'Premise 1: High-value customers generate 80% profit. Premise 2: This customer has high value. Conclusion: Premium treatment.',
    marketing:
      'Premise 1: Social media reaches young audiences. Premise 2: Target is young. Conclusion: Use social media.',
    manufacturing:
      'Premise 1: Automation reduces costs. Premise 2: This step is cost-intensive. Conclusion: Automate this step.',
    hr: 'Premise 1: Clear expectations improve performance. Premise 2: Unclear role expectations. Conclusion: Clarify expectations.',
    logistics:
      'Premise 1: Consolidated shipments reduce costs. Premise 2: These shipments can consolidate. Conclusion: Consolidate.',
    legal: 'Premise 1: Ambiguous terms create liability. Premise 2: This term is ambiguous. Conclusion: Revise term.',
    'customer-service':
      'Premise 1: Empathy increases satisfaction. Premise 2: Customer is upset. Conclusion: Show empathy.',
    'project-management':
      'Premise 1: Clear communication prevents surprises. Premise 2: Stakeholders lack clarity. Conclusion: Communicate clearly.',
    research:
      'Premise 1: Large samples increase validity. Premise 2: This study can use large samples. Conclusion: Use larger sample.',
    it: 'Premise 1: Redundancy prevents outages. Premise 2: This system is critical. Conclusion: Add redundancy.',
    sales: 'Premise 1: ROI focus works with CFOs. Premise 2: Decision-maker is CFO. Conclusion: Emphasize ROI.',
    consulting:
      'Premise 1: Market consolidation increases returns. Premise 2: Client operates in consolidating market. Conclusion: Recommend consolidation.',
    journalism:
      'Premise 1: Extraordinary claims need extraordinary evidence. Premise 2: This is extraordinary claim. Conclusion: Verify thoroughly.',
    'non-profit':
      'Premise 1: Community involvement increases impact. Premise 2: Issue affects community. Conclusion: Engage community.',
    engineering:
      'Premise 1: Distributed systems are fault-tolerant. Premise 2: Reliability is critical. Conclusion: Use distributed design.',
    'policy-making':
      'Premise 1: Stakeholder support ensures implementation. Premise 2: Multiple stakeholders affected. Conclusion: Build coalition.',
  },
  'self-consistency': {
    finance:
      'Reasoning Path 1: Risk analysis → Conclusion A. Reasoning Path 2: Regulatory review → Conclusion A. Consensus: Proceed with Conclusion A.',
    healthcare:
      'Clinical Path 1: Symptoms → Diagnosis A. Clinical Path 2: Test results → Diagnosis A. Consensus: Diagnose A.',
    education:
      'Learning Path 1: Objectives → Design A. Learning Path 2: Evidence-based research → Design A. Consensus: Use Design A.',
    tech: 'Technical Path 1: Performance analysis → Solution A. Path 2: Architecture review → Solution A. Consensus: Implement A.',
    retail:
      'Analysis Path 1: Customer data → Strategy A. Path 2: Market trends → Strategy A. Consensus: Execute Strategy A.',
    marketing:
      'Campaign Path 1: Audience research → Messaging A. Path 2: Competitor analysis → Messaging A. Consensus: Use Messaging A.',
    manufacturing:
      'Process Path 1: Efficiency analysis → Change A. Path 2: Quality review → Change A. Consensus: Implement Change A.',
    hr: 'Development Path 1: Skills assessment → Plan A. Path 2: Career goals → Plan A. Consensus: Follow Plan A.',
    logistics:
      'Route Path 1: Traffic analysis → Route A. Path 2: Cost analysis → Route A. Consensus: Use Route A.',
    legal: 'Legal Path 1: Contract review → Action A. Path 2: Precedent analysis → Action A. Consensus: Take Action A.',
    'customer-service':
      'Service Path 1: Issue analysis → Solution A. Path 2: Best practices → Solution A. Consensus: Implement Solution A.',
    'project-management':
      'Planning Path 1: Scope analysis → Plan A. Path 2: Historical data → Plan A. Consensus: Execute Plan A.',
    research: 'Research Path 1: Hypothesis testing → Result A. Path 2: Alternative design → Result A. Consensus: Report Result A.',
    it: 'Security Path 1: Threat analysis → Defense A. Path 2: Best practices → Defense A. Consensus: Deploy Defense A.',
    sales: 'Sales Path 1: Prospect analysis → Approach A. Path 2: Win analysis → Approach A. Consensus: Use Approach A.',
    consulting:
      'Strategy Path 1: Market analysis → Recommendation A. Path 2: Internal analysis → Recommendation A. Consensus: Recommend A.',
    journalism:
      'Verification Path 1: Source check → Story OK. Path 2: Fact-check → Story OK. Consensus: Publish story.',
    'non-profit':
      'Impact Path 1: Mission analysis → Program A. Path 2: Community feedback → Program A. Consensus: Launch Program A.',
    engineering:
      'Design Path 1: Requirements analysis → Design A. Path 2: Simulation → Design A. Consensus: Build Design A.',
    'policy-making':
      'Policy Path 1: Data analysis → Policy A. Path 2: Stakeholder input → Policy A. Consensus: Propose Policy A.',
  },
  'chain-of-symbol': {
    finance: 'Let Risk = f(Velocity, Geography, Behavior). If Risk > Threshold, then Flag = True. Calculate for this transaction.',
    healthcare:
      'Let Diagnosis = g(Symptoms, Tests, History). If Confidence(Diagnosis) > 0.9, then Recommend. Calculate for this case.',
    education:
      'Let Outcome = h(Instruction, Practice, Assessment). If Outcome ≥ Mastery, then Advance. Evaluate this student.',
    tech: 'Let Performance = p(Cache, Database, Network). If Performance > Target, then Deploy. Calculate for this design.',
    retail:
      'Let Value = v(Purchase_Frequency, Amount, Loyalty). If Value > Segment_Threshold, then Premium. Calculate for this customer.',
    marketing:
      'Let ROI = r(Budget, Reach, Conversion). If ROI > Target, then Expand. Calculate this campaign.',
    manufacturing:
      'Let Efficiency = e(Speed, Quality, Cost). If Efficiency > Baseline, then Implement. Calculate improvement.',
    hr: 'Let Engagement = g(Clarity, Support, Growth). If Engagement > Low, then Retain. Measure for this employee.',
    logistics:
      'Let Cost = c(Distance, Weight, Mode). If Cost < Budget, then Execute. Calculate for this shipment.',
    legal: 'Let Risk = r(Ambiguity, Precedent, Liability). If Risk > Acceptable, then Revise. Calculate for this clause.',
    'customer-service':
      'Let Satisfaction = s(Issue_Resolved, Time_to_Resolve, Empathy). If Satisfaction > Target, then NPS++. Calculate for this case.',
    'project-management':
      'Let Success = p(Scope_Met, Timeline_Met, Budget_Met). If Success = True, then Project_OK. Calculate metrics.',
    research:
      'Let Validity = v(Sample_Size, Design, Controls). If Validity > Threshold, then Publishable. Evaluate study.',
    it: 'Let Uptime = u(Redundancy, Monitoring, Recovery). If Uptime > 99.9%, then SLA_Met. Calculate for this system.',
    sales: 'Let Deal_Value = d(Price, Volume, Duration). If Deal_Value > Quota, then Close. Calculate for this opportunity.',
    consulting:
      'Let Impact = i(Revenue_Gain, Cost_Reduction, Risk_Mitigation). If Impact > Investment, then ROI_Positive. Calculate.',
    journalism:
      'Let Credibility = c(Sources, Verification, Balance). If Credibility = High, then Publish. Evaluate story.',
    'non-profit':
      'Let Impact = i(Beneficiaries, Duration, Sustainability). If Impact > Baseline, then Fund. Calculate for this program.',
    engineering:
      'Let Quality = q(Functionality, Reliability, Performance). If Quality = Good, then Release. Evaluate build.',
    'policy-making':
      'Let Benefit = b(Stakeholders_Supported, Unintended_Costs, Implementation_Feasibility). If Benefit > Costs, then Recommend. Calculate.',
  },
  'chain-of-verification': {
    finance:
      'Step 1: Verify regulatory framework applies ✓. Step 2: Verify data accuracy ✓. Step 3: Verify conclusion ✓. Review this transaction.',
    healthcare:
      'Step 1: Verify patient history accuracy ✓. Step 2: Verify test results ✓. Step 3: Verify diagnosis ✓. Assess this case.',
    education:
      'Step 1: Verify objective clarity ✓. Step 2: Verify activity alignment ✓. Step 3: Verify assessment validity ✓. Design this lesson.',
    tech: 'Step 1: Verify requirements are clear ✓. Step 2: Verify solution satisfies requirements ✓. Step 3: Verify performance metrics ✓. Propose design.',
    retail:
      'Step 1: Verify customer segment correctly identified ✓. Step 2: Verify strategy fits segment ✓. Step 3: Verify expected ROI ✓. Plan campaign.',
    marketing:
      'Step 1: Verify audience understanding ✓. Step 2: Verify message resonance ✓. Step 3: Verify channel effectiveness ✓. Develop campaign.',
    manufacturing:
      'Step 1: Verify current process metrics ✓. Step 2: Verify improvement feasibility ✓. Step 3: Verify cost-benefit ✓. Plan improvement.',
    hr: 'Step 1: Verify role requirements ✓. Step 2: Verify plan completeness ✓. Step 3: Verify success metrics ✓. Plan onboarding.',
    logistics:
      'Step 1: Verify all locations ✓. Step 2: Verify route optimization ✓. Step 3: Verify delivery feasibility ✓. Plan delivery.',
    legal: 'Step 1: Verify all risks identified ✓. Step 2: Verify mitigations adequate ✓. Step 3: Verify enforceability ✓. Review agreement.',
    'customer-service':
      'Step 1: Verify problem understanding ✓. Step 2: Verify solution addresses root cause ✓. Step 3: Verify customer satisfaction ✓. Resolve issue.',
    'project-management':
      'Step 1: Verify scope clarity ✓. Step 2: Verify timeline realism ✓. Step 3: Verify resource availability ✓. Plan project.',
    research:
      'Step 1: Verify methodology soundness ✓. Step 2: Verify data quality ✓. Step 3: Verify conclusions supported ✓. Conduct study.',
    it: 'Step 1: Verify threat assessment ✓. Step 2: Verify mitigation coverage ✓. Step 3: Verify monitoring capability ✓. Design security.',
    sales: 'Step 1: Verify prospect fit ✓. Step 2: Verify solution addresses needs ✓. Step 3: Verify value proposition ✓. Close deal.',
    consulting:
      'Step 1: Verify diagnosis accuracy ✓. Step 2: Verify recommendation feasibility ✓. Step 3: Verify ROI projection ✓. Make recommendation.',
    journalism:
      'Step 1: Verify sources are credible ✓. Step 2: Verify claims are accurate ✓. Step 3: Verify balance and fairness ✓. Publish story.',
    'non-profit':
      'Step 1: Verify mission alignment ✓. Step 2: Verify impact potential ✓. Step 3: Verify sustainability ✓. Plan program.',
    engineering:
      'Step 1: Verify requirements coverage ✓. Step 2: Verify design correctness ✓. Step 3: Verify performance targets ✓. Implement.',
    'policy-making':
      'Step 1: Verify stakeholder analysis ✓. Step 2: Verify data accuracy ✓. Step 3: Verify unintended consequences ✓. Recommend policy.',
  },
  'emotion-prompting': {
    finance:
      'This decision impacts your financial security and that of your customers. Help me make the right choice for compliance.',
    healthcare:
      'This patient\'s wellbeing depends on an accurate diagnosis. Help me provide excellent care with your expertise.',
    education:
      'These students are counting on learning. Help me design instruction that will truly inspire them.',
    tech:
      'Our users depend on this system\'s reliability. Help me build something they can trust completely.',
    retail:
      'Our customers are looking for genuine value and connection. Help me create an experience they\'ll love.',
    marketing:
      'Our brand means something to our community. Help me communicate in a way that resonates authentically.',
    manufacturing:
      'Our team takes pride in quality work. Help me design a process that lets them do their best.',
    hr: 'This person is starting a new chapter in their career. Help me make their first days meaningful and welcoming.',
    logistics:
      'Customers are waiting for their delivery. Help me get it to them efficiently and reliably.',
    legal: 'This agreement affects real people and real businesses. Help me protect everyone\'s interests fairly.',
    'customer-service':
      'This customer is frustrated and needs genuine help. Help me resolve this with empathy and excellence.',
    'project-management':
      'Our team is invested in success. Help me create a plan that gets us there together.',
    research:
      'This research could make a real difference. Help me design it rigorously to maximize impact.',
    it: 'Organizations depend on our systems. Help me secure them with conviction and thoroughness.',
    sales: 'This prospect has real problems we can solve. Help me show them the genuine value we offer.',
    consulting:
      'Our client is at a critical juncture. Help me recommend what will truly transform their business.',
    journalism:
      'Our readers deserve the truth. Help me verify this story with integrity and care.',
    'non-profit':
      'These communities are counting on us. Help me create programs that truly change lives.',
    engineering:
      'Users will interact with this component daily. Help me build something robust and delightful.',
    'policy-making':
      'Real people will be affected by this policy. Help me recommend what will create the most good.',
  },
  'skeleton-of-thought': {
    finance: 'Outline: I. Risk Assessment II. Regulatory Review III. Mitigation Strategy IV. Compliance Verification. Now write the analysis.',
    healthcare:
      'Outline: I. Case Summary II. Differential Diagnosis III. Diagnostic Strategy IV. Treatment Plan V. Patient Education. Now analyze.',
    education:
      'Outline: I. Learning Objectives II. Prior Knowledge III. Content Sequence IV. Activities V. Assessment. Now design the lesson.',
    tech: 'Outline: I. Requirements II. Architecture Options III. Technical Design IV. Performance Plan V. Deployment Strategy. Now propose.',
    retail:
      'Outline: I. Segment Profile II. Behaviors III. Marketing Strategy IV. Tactics V. Expected ROI. Now plan the campaign.',
    marketing:
      'Outline: I. Audience II. Insights III. Messaging IV. Channels V. Measurement. Now develop the strategy.',
    manufacturing:
      'Outline: I. Process Overview II. Bottleneck Analysis III. Solutions IV. Implementation V. Verification. Now optimize.',
    hr: 'Outline: I. Role Context II. Pre-boarding III. Week 1 IV. Month 1 V. Success Metrics. Now plan onboarding.',
    logistics:
      'Outline: I. Route Overview II. Constraints III. Optimization IV. Verification V. Contingency. Now plan delivery.',
    legal: 'Outline: I. Parties II. Obligations III. Risk Areas IV. Mitigations V. Recommendations. Now review.',
    'customer-service':
      'Outline: I. Issue Summary II. Root Cause III. Solution IV. Implementation V. Follow-up. Now resolve.',
    'project-management':
      'Outline: I. Scope II. Deliverables III. Tasks IV. Timeline V. Resources. Now plan the project.',
    research:
      'Outline: I. Research Question II. Hypothesis III. Methodology IV. Data Plan V. Analysis Strategy. Now design.',
    it: 'Outline: I. Threats II. Vulnerabilities III. Mitigations IV. Monitoring V. Response Plan. Now design security.',
    sales: 'Outline: I. Prospect Profile II. Needs III. Solutions IV. Value Prop V. Close Strategy. Now develop pitch.',
    consulting:
      'Outline: I. Situation II. Root Causes III. Options IV. Recommendation V. Implementation Plan. Now recommend.',
    journalism:
      'Outline: I. Story Angle II. Key Questions III. Sources IV. Evidence V. Narrative. Now verify and write.',
    'non-profit':
      'Outline: I. Mission II. Target Community III. Program Design IV. Impact Plan V. Sustainability. Now plan program.',
    engineering:
      'Outline: I. Requirements II. Design Approach III. Components IV. Testing V. Deployment. Now implement.',
    'policy-making':
      'Outline: I. Problem II. Stakeholders III. Options IV. Analysis V. Recommendation. Now recommend policy.',
  },
  art: {
    finance:
      'Use reasoning to identify risk factors, then invoke compliance tools to verify regulatory requirements. Analyze this transaction.',
    healthcare:
      'Use clinical reasoning to narrow diagnoses, then invoke diagnostic tools to confirm. Assess this patient.',
    education:
      'Use pedagogical reasoning to select methods, then invoke curriculum tools to align content. Design this lesson.',
    tech: 'Use architectural reasoning to propose solutions, then invoke performance tools to validate. Design this system.',
    retail:
      'Use customer insight reasoning to identify strategy, then invoke analytics tools to model ROI. Plan this campaign.',
    marketing:
      'Use audience reasoning to craft message, then invoke channel tools to optimize distribution. Create this campaign.',
    manufacturing:
      'Use process reasoning to identify improvements, then invoke optimization tools to simulate. Plan improvement.',
    hr: 'Use role reasoning to determine needs, then invoke competency tools to build curriculum. Plan onboarding.',
    logistics:
      'Use route reasoning to optimize, then invoke simulation tools to validate delivery. Plan delivery.',
    legal: 'Use legal reasoning to identify risks, then invoke contract tools to verify terms. Review agreement.',
    'customer-service':
      'Use problem reasoning to find solutions, then invoke knowledge tools to validate resolution. Resolve issue.',
    'project-management':
      'Use planning reasoning to schedule, then invoke resource tools to allocate people. Plan project.',
    research:
      'Use methodological reasoning to design, then invoke statistical tools to validate. Design study.',
    it: 'Use security reasoning to assess threats, then invoke penetration testing tools. Design security.',
    sales: 'Use sales reasoning to understand prospect, then invoke CRM tools to personalize pitch. Close deal.',
    consulting:
      'Use analytical reasoning to diagnose, then invoke modeling tools to project impact. Recommend strategy.',
    journalism:
      'Use investigative reasoning to assess story, then invoke verification tools to fact-check. Verify story.',
    'non-profit':
      'Use mission reasoning to define program, then invoke impact tools to measure results. Plan program.',
    engineering:
      'Use engineering reasoning to architect, then invoke testing tools to validate. Implement.',
    'policy-making':
      'Use policy reasoning to analyze options, then invoke impact modeling tools. Recommend policy.',
  },
  'instruction-tuning': {
    finance: 'Instruction: "Evaluate financial risk with precision. Consider regulatory requirements. Flag any compliance gaps." Parameters: Strictness=High, Detail=Full.',
    healthcare:
      'Instruction: "Make clinical recommendations cautiously. Emphasize evidence. Always recommend physician review." Parameters: Safety=Maximum, Caution=High.',
    education:
      'Instruction: "Design active learning experiences. Align to objectives. Consider diverse learners." Parameters: Engagement=High, Inclusivity=High.',
    tech: 'Instruction: "Architect for scale and reliability. Consider failures. Minimize latency." Parameters: Robustness=High, Performance=High.',
    retail:
      'Instruction: "Understand customer motivation. Personalize experience. Maximize lifetime value." Parameters: Personalization=High, Value_Focus=True.',
    marketing:
      'Instruction: "Craft authentic messages. Know your audience deeply. Measure everything." Parameters: Authenticity=True, Analytics=Deep.',
    manufacturing:
      'Instruction: "Optimize continuously. Maintain quality standards. Reduce waste." Parameters: Efficiency=High, Quality=High.',
    hr: 'Instruction: "Develop people thoughtfully. Create belonging. Support growth." Parameters: Development=True, Inclusion=High.',
    logistics:
      'Instruction: "Plan efficiently. Ensure reliability. Delight customers." Parameters: Efficiency=High, Reliability=High.',
    legal: 'Instruction: "Review thoroughly. Flag all risks. Protect interests." Parameters: Thoroughness=Complete, Risk_Aversion=High.',
    'customer-service':
      'Instruction: "Listen empathetically. Resolve completely. Exceed expectations." Parameters: Empathy=High, Resolution_Rate=100%.',
    'project-management':
      'Instruction: "Plan clearly. Communicate constantly. Deliver on commitments." Parameters: Clarity=High, Communication=Frequent.',
    research:
      'Instruction: "Design rigorously. Control variables. Report honestly." Parameters: Rigor=High, Integrity=Complete.',
    it: 'Instruction: "Secure proactively. Monitor continuously. Respond rapidly." Parameters: Security=Maximum, Monitoring=Continuous.',
    sales: 'Instruction: "Listen to understand. Show genuine value. Build trust." Parameters: Listening=True, Authenticity=High.',
    consulting:
      'Instruction: "Analyze thoroughly. Think strategically. Recommend boldly." Parameters: Analysis_Depth=Deep, Strategy_Focus=True.',
    journalism:
      'Instruction: "Verify rigorously. Seek multiple perspectives. Report fairly." Parameters: Verification=Complete, Fairness=High.',
    'non-profit':
      'Instruction: "Serve mission. Measure impact. Sustain growth." Parameters: Mission_Aligned=True, Impact_Focused=True.',
    engineering:
      'Instruction: "Build quality. Plan for failure. Make it maintainable." Parameters: Quality=High, Maintainability=High.',
    'policy-making':
      'Instruction: "Analyze data deeply. Consult stakeholders. Think long-term." Parameters: Data_Driven=True, Stakeholder_Inclusive=True.',
  },
  ape: {
    finance: 'Let AI refine this prompt: "Analyze transaction risk considering velocity, geography, behavioral factors, and regulatory context."',
    healthcare:
      'Let AI refine this prompt: "Assess clinical case with consideration of symptoms, test results, medical history, and evidence-based guidelines."',
    education:
      'Let AI refine this prompt: "Design learning activity aligned with objectives, engaging for diverse students, with clear assessment method."',
    tech: 'Let AI refine this prompt: "Propose system architecture meeting performance requirements, scaled for growth, resilient to failures."',
    retail:
      'Let AI refine this prompt: "Segment customers and recommend targeting strategy maximizing lifetime value with personalized engagement."',
    marketing:
      'Let AI refine this prompt: "Develop campaign reaching target audience authentically with compelling messaging across optimal channels."',
    manufacturing:
      'Let AI refine this prompt: "Optimize process improving efficiency and quality while reducing cost and waste."',
    hr: 'Let AI refine this prompt: "Create onboarding experience that integrates new person, builds confidence, and supports success."',
    logistics:
      'Let AI refine this prompt: "Plan delivery network optimizing for cost, speed, reliability, and customer satisfaction."',
    legal: 'Let AI refine this prompt: "Review contract identifying all risks, recommending protections, ensuring enforceability."',
    'customer-service':
      'Let AI refine this prompt: "Resolve customer issue identifying root cause, solving completely, ensuring satisfaction and retention."',
    'project-management':
      'Let AI refine this prompt: "Plan project with clear scope, realistic timeline, allocated resources, identified risks, engagement strategy."',
    research:
      'Let AI refine this prompt: "Design study testing hypothesis rigorously with appropriate methodology, sample size, controls, and analysis."',
    it: 'Let AI refine this prompt: "Design security system protecting assets against identified threats with monitoring and rapid response."',
    sales: 'Let AI refine this prompt: "Develop sales strategy understanding prospect, articulating value, addressing objections, closing deal."',
    consulting:
      'Let AI refine this prompt: "Analyze business situation, diagnose root causes, recommend strategic options, project implementation ROI."',
    journalism:
      'Let AI refine this prompt: "Investigate story pursuing truth through multiple credible sources with fair, balanced, accurate reporting."',
    'non-profit':
      'Let AI refine this prompt: "Plan program advancing mission with measurable impact, sustainable operations, strong community partnerships."',
    engineering:
      'Let AI refine this prompt: "Build component meeting requirements, tested thoroughly, documented clearly, maintainable long-term."',
    'policy-making':
      'Let AI refine this prompt: "Develop policy addressing problem, supporting stakeholders, evidence-based, feasible, with measured impact."',
  },
  'system-2-attention': {
    finance:
      'Consider this carefully: What regulatory frameworks apply? What are the failure modes? What could go wrong? Analyze this transaction.',
    healthcare:
      'Think deeply about this: What is the differential diagnosis? What tests matter most? What are the risks? Assess this patient.',
    education:
      'Reflect on this: What are core learning outcomes? How do students learn best? How will you assess mastery? Design this lesson.',
    tech: 'Pause and consider: What are the actual requirements? What could break? What about scalability? Design this system.',
    retail:
      'Think through this: Who is this customer really? What do they value? What will make them loyal? Plan this campaign.',
    marketing:
      'Reflect deeply: Who is the real audience? What are their actual motivations? How will they respond? Create this campaign.',
    manufacturing:
      'Consider carefully: What is the constraint? What are side effects? What is the true cost? Optimize this process.',
    hr: 'Think about this person: What will make them feel welcome? What do they need to succeed? How do we build trust? Plan onboarding.',
    logistics:
      'Consider this network: Where are the inefficiencies? What are the constraints? What can be optimized? Plan delivery.',
    legal: 'Examine this closely: What are all the risks? What precedents apply? What is enforceable? Review agreement.',
    'customer-service':
      'Understand this fully: What is the real problem? What would truly satisfy them? How do we retain them? Resolve issue.',
    'project-management':
      'Think strategically: What could derail this? Who needs to be engaged? What are success criteria? Plan project.',
    research:
      'Consider deeply: Is this methodology sound? Are there alternative explanations? What are limitations? Design study.',
    it: 'Analyze this thoroughly: What are we protecting? What attacks matter most? What is our detection capability? Design security.',
    sales: 'Understand this prospect deeply: What keeps them up at night? What is real value? What is their decision process? Close deal.',
    consulting:
      'Think strategically: What is the real problem? What are we missing? What is the best path? Recommend strategy.',
    journalism:
      'Investigate thoroughly: Is this story accurate? Am I missing perspective? What is my evidence? Verify story.',
    'non-profit':
      'Consider this deeply: Why does this matter? Who will benefit? How do we measure success? Plan program.',
    engineering:
      'Think carefully: What could fail? How do we recover? How will this scale? Implement.',
    'policy-making':
      'Analyze this thoroughly: Who wins? Who loses? What are unintended consequences? Recommend policy.',
  },
  react: {
    finance:
      'Reason: Market conditions suggest elevated risk. Act: Check regulatory database. Observe: No compliance alerts. Reason: Conclude moderate risk.',
    healthcare:
      'Reason: Symptoms suggest condition A. Act: Order test B. Observe: Test results support condition A. Reason: Recommend treatment A.',
    education:
      'Reason: Objective requires critical thinking. Act: Design Socratic activity. Observe: Students engage deeply. Reason: Activity effective.',
    tech: 'Reason: Requirements demand low latency. Act: Test caching solution. Observe: 50% latency reduction achieved. Reason: Implement caching.',
    retail:
      'Reason: Customer shows high value signals. Act: Offer loyalty program. Observe: Engagement increases. Reason: Expand program.',
    marketing:
      'Reason: Audience prefers visual content. Act: Create video campaign. Observe: 3x engagement vs text. Reason: Prioritize video.',
    manufacturing:
      'Reason: Bottleneck is assembly. Act: Pilot automation. Observe: Efficiency improves. Reason: Full automation approved.',
    hr: 'Reason: Role requires teamwork. Act: Assign peer buddy. Observe: Onboarding smooth. Reason: Continue buddy system.',
    logistics:
      'Reason: Route A may be congested. Act: Compare with Route B. Observe: Route B is faster. Reason: Use Route B.',
    legal: 'Reason: Clause seems ambiguous. Act: Research precedent. Observe: Precedent is unclear. Reason: Revise clause.',
    'customer-service':
      'Reason: Issue appears to be billing error. Act: Review account. Observe: Overcharge confirmed. Reason: Issue refund.',
    'project-management':
      'Reason: Timeline is tight. Act: Identify critical path. Observe: Can compress 2 weeks. Reason: Execute acceleration.',
    research:
      'Reason: Sample size matters. Act: Calculate power. Observe: 50 not enough. Reason: Increase to 200.',
    it: 'Reason: System is critical. Act: Run audit. Observe: Gaps in monitoring. Reason: Add monitoring layer.',
    sales: 'Reason: Prospect is hesitant. Act: Offer trial. Observe: Trial shows value. Reason: Close deal.',
    consulting:
      'Reason: Revenue is declining. Act: Analyze customer base. Observe: Top 20% generating 80%. Reason: Focus on top tier.',
    journalism:
      'Reason: Source makes bold claim. Act: Verify with expert. Observe: Expert confirms partially. Reason: Report with caveats.',
    'non-profit':
      'Reason: Program needs growth. Act: Survey beneficiaries. Observe: Demand exceeds capacity. Reason: Expand program.',
    engineering:
      'Reason: Performance degrading. Act: Profile code. Observe: Database is bottleneck. Reason: Add caching.',
    'policy-making':
      'Reason: Policy affects low-income community. Act: Hold stakeholder meeting. Observe: Concerns about displacement. Reason: Add safeguards.',
  },
  'structured-chain': {
    finance: `<analysis>
  <risk_factors>
    <velocity>{{data.velocity}}</velocity>
    <geography>{{data.geography}}</geography>
    <behavior>{{data.behavior}}</behavior>
  </risk_factors>
  <compliance_check>{{compliance_status}}</compliance_check>
  <conclusion>{{risk_level}}</conclusion>
</analysis>`,
    healthcare: `<clinical_analysis>
  <symptoms>{{symptoms}}</symptoms>
  <test_results>{{results}}</test_results>
  <differentials>{{diffs}}</differentials>
  <diagnosis>{{diagnosis}}</diagnosis>
  <treatment>{{treatment}}</treatment>
</clinical_analysis>`,
    education: `<lesson_plan>
  <objectives>{{objectives}}</objectives>
  <activities>{{activities}}</activities>
  <assessment>{{assessment}}</assessment>
  <differentiation>{{differentiation}}</differentiation>
</lesson_plan>`,
    tech: `<architecture>
  <requirements>{{requirements}}</requirements>
  <components>{{components}}</components>
  <performance>{{performance}}</performance>
  <scalability>{{scalability}}</scalability>
</architecture>`,
    retail: `<campaign>
  <segment>{{segment}}</segment>
  <strategy>{{strategy}}</strategy>
  <tactics>{{tactics}}</tactics>
  <expected_roi>{{roi}}</expected_roi>
</campaign>`,
    marketing: `<marketing_plan>
  <audience>{{audience}}</audience>
  <messaging>{{messaging}}</messaging>
  <channels>{{channels}}</channels>
  <metrics>{{metrics}}</metrics>
</marketing_plan>`,
    manufacturing: `<process_improvement>
  <current_state>{{current}}</current_state>
  <bottleneck>{{bottleneck}}</bottleneck>
  <solution>{{solution}}</solution>
  <roi>{{roi}}</roi>
</process_improvement>`,
    hr: `<onboarding_plan>
  <pre_start>{{pre_start}}</pre_start>
  <week_one>{{week_one}}</week_one>
  <month_one>{{month_one}}</month_one>
  <success_metrics>{{metrics}}</success_metrics>
</onboarding_plan>`,
    logistics: `<delivery_plan>
  <origin>{{origin}}</origin>
  <destination>{{destination}}</destination>
  <route>{{route}}</route>
  <constraints>{{constraints}}</constraints>
</delivery_plan>`,
    legal: `<contract_review>
  <parties>{{parties}}</parties>
  <risks>{{risks}}</risks>
  <mitigations>{{mitigations}}</mitigations>
  <recommendation>{{recommendation}}</recommendation>
</contract_review>`,
    'customer-service': `<issue_resolution>
  <issue>{{issue}}</issue>
  <root_cause>{{cause}}</root_cause>
  <solution>{{solution}}</solution>
  <follow_up>{{follow_up}}</follow_up>
</issue_resolution>`,
    'project-management': `<project_plan>
  <scope>{{scope}}</scope>
  <deliverables>{{deliverables}}</deliverables>
  <timeline>{{timeline}}</timeline>
  <resources>{{resources}}</resources>
</project_plan>`,
    research: `<study_design>
  <hypothesis>{{hypothesis}}</hypothesis>
  <methodology>{{methodology}}</methodology>
  <sample>{{sample}}</sample>
  <analysis>{{analysis}}</analysis>
</study_design>`,
    it: `<security_design>
  <assets>{{assets}}</assets>
  <threats>{{threats}}</threats>
  <mitigations>{{mitigations}}</mitigations>
  <monitoring>{{monitoring}}</monitoring>
</security_design>`,
    sales: `<sales_strategy>
  <prospect>{{prospect}}</prospect>
  <needs>{{needs}}</needs>
  <value_prop>{{value}}</value_prop>
  <close_plan>{{close}}</close_plan>
</sales_strategy>`,
    consulting: `<strategic_recommendation>
  <situation>{{situation}}</situation>
  <diagnosis>{{diagnosis}}</diagnosis>
  <options>{{options}}</options>
  <recommendation>{{recommendation}}</recommendation>
</strategic_recommendation>`,
    journalism: `<story_verification>
  <angle>{{angle}}</angle>
  <sources>{{sources}}</sources>
  <verification>{{verification}}</verification>
  <narrative>{{narrative}}</narrative>
</story_verification>`,
    'non-profit': `<program_plan>
  <mission>{{mission}}</mission>
  <target_community>{{community}}</target_community>
  <program>{{program}}</program>
  <impact>{{impact}}</impact>
</program_plan>`,
    engineering: `<implementation_plan>
  <requirements>{{requirements}}</requirements>
  <design>{{design}}</design>
  <testing>{{testing}}</testing>
  <deployment>{{deployment}}</deployment>
</implementation_plan>`,
    'policy-making': `<policy_recommendation>
  <problem>{{problem}}</problem>
  <stakeholders>{{stakeholders}}</stakeholders>
  <options>{{options}}</options>
  <recommendation>{{recommendation}}</recommendation>
</policy_recommendation>`,
  },
  'chain-of-knowledge': {
    finance:
      'Foundation: Regulatory framework defines compliance requirements. Layer 2: Transaction velocity is high. Layer 3: High velocity + suspicious pattern = elevated risk. Conclusion: Flag transaction.',
    healthcare:
      'Foundation: Patient has fever (102F) and cough. Layer 2: CXR shows infiltrate. Layer 3: Fever + cough + infiltrate = pneumonia likely. Conclusion: Treat for pneumonia.',
    education:
      'Foundation: Learning requires active engagement. Layer 2: Socratic method promotes thinking. Layer 3: Thinking leads to deep learning. Conclusion: Use Socratic dialogue.',
    tech: 'Foundation: Users need responsive apps. Layer 2: Caching reduces latency. Layer 3: Low latency = good UX. Conclusion: Implement caching.',
    retail:
      'Foundation: Customers show loyalty patterns. Layer 2: High-frequency buyers are profitable. Layer 3: Profitability compounds over time. Conclusion: Invest in loyalty program.',
    marketing:
      'Foundation: Audiences prefer authentic messages. Layer 2: Authenticity builds trust. Layer 3: Trust drives purchases. Conclusion: Message authentically.',
    manufacturing:
      'Foundation: Waste reduces profit. Layer 2: Bottlenecks cause waste. Layer 3: Identifying bottlenecks allows optimization. Conclusion: Eliminate bottlenecks.',
    hr: 'Foundation: Clear expectations improve performance. Layer 2: New employees lack context. Layer 3: Onboarding provides context. Conclusion: Structured onboarding matters.',
    logistics:
      'Foundation: Distance increases cost. Layer 2: Route optimization reduces distance. Layer 3: Lower cost improves margins. Conclusion: Optimize routes.',
    legal: 'Foundation: Ambiguity creates liability. Layer 2: Precedent clarifies intent. Layer 3: Clarity reduces risk. Conclusion: Revise ambiguous terms.',
    'customer-service':
      'Foundation: Customer satisfaction drives loyalty. Layer 2: Fast resolution increases satisfaction. Layer 3: Loyalty increases lifetime value. Conclusion: Resolve quickly.',
    'project-management':
      'Foundation: Clear plans prevent surprises. Layer 2: Communication builds alignment. Layer 3: Alignment enables execution. Conclusion: Plan and communicate.',
    research:
      'Foundation: Rigor prevents false conclusions. Layer 2: Large samples increase rigor. Layer 3: Rigorous conclusions drive action. Conclusion: Ensure adequate sample size.',
    it: 'Foundation: Threats are constantly evolving. Layer 2: Monitoring detects threats. Layer 3: Detection enables response. Conclusion: Monitor continuously.',
    sales: 'Foundation: Understanding builds trust. Layer 2: Trust enables conversations. Layer 3: Conversations lead to closes. Conclusion: Listen deeply.',
    consulting:
      'Foundation: Problems have root causes. Layer 2: Analysis reveals root causes. Layer 3: Addressing root causes creates impact. Conclusion: Analyze thoroughly.',
    journalism:
      'Foundation: Accuracy builds credibility. Layer 2: Multiple sources verify accuracy. Layer 3: Credibility enables influence. Conclusion: Verify thoroughly.',
    'non-profit':
      'Foundation: Mission alignment drives impact. Layer 2: Community input ensures alignment. Layer 3: Aligned programs succeed. Conclusion: Engage community.',
    engineering:
      'Foundation: Requirements drive design. Layer 2: Testing validates design. Layer 3: Validation ensures quality. Conclusion: Test thoroughly.',
    'policy-making':
      'Foundation: Data informs decisions. Layer 2: Stakeholders provide context. Layer 3: Context ensures implementation. Conclusion: Consult stakeholders.',
  },
  'chain-of-code': {
    finance: 'Code representation: if (velocity > threshold && pattern == suspicious) { risk_score += 50 }; Analyze this transaction.',
    healthcare:
      'Code representation: diagnosis = evaluate(symptoms, tests, history); Assess this patient with clinical logic.',
    education:
      'Code representation: activity = select(objective, engagement_level); engagement += active_learning; Design this lesson.',
    tech: 'Code representation: performance = measure(implementation); if (performance < target) { optimize() }; Design system.',
    retail:
      'Code representation: segment = classify(purchase_history, frequency); revenue = predict(segment, strategy); Plan campaign.',
    marketing:
      'Code representation: roi = analyze(budget, reach, conversion); roi > target ? expand() : optimize(); Create campaign.',
    manufacturing:
      'Code representation: efficiency = calculate(speed, quality, cost); if (improvement_found) { implement() }; Optimize process.',
    hr: 'Code representation: success = onboard(clarity, support, growth); measure(engagement); Plan onboarding.',
    logistics:
      'Code representation: cost = optimize_route(distance, constraints); deliver(route, items); Plan delivery.',
    legal: 'Code representation: risk = analyze(clause); if (risk > acceptable) { revise() }; Review agreement.',
    'customer-service':
      'Code representation: resolve_issue(root_cause, solution); satisfaction = measure(); follow_up(); Resolve issue.',
    'project-management':
      'Code representation: project = plan(scope, timeline, resources); track(progress); adjust(); Plan project.',
    research:
      'Code representation: validity = check(sample_size, methodology); if (valid) { publish() }; Design study.',
    it: 'Code representation: security = defense(threats); monitor(alerts); respond(incident); Design security.',
    sales: 'Code representation: fit = assess(prospect, solution); value = demonstrate(); close = attempt(); Close deal.',
    consulting:
      'Code representation: diagnosis = analyze(data); options = generate(diagnosis); recommend(best_option); Recommend strategy.',
    journalism:
      'Code representation: credibility = verify(sources); if (credible && balanced) { publish() }; Verify story.',
    'non-profit':
      'Code representation: impact = measure(program); if (impact > target) { scale() }; Plan program.',
    engineering:
      'Code representation: quality = test(requirements, implementation); if (pass) { deploy() }; Implement.',
    'policy-making':
      'Code representation: stakeholders = identify(); impact = model(policy); if (positive) { recommend() }; Recommend policy.',
  },
};

/**
 * Get all prompt types with descriptions
 */
export function getPromptTypes(): Array<{ type: PromptType; name: string; description: string }> {
  return Object.entries(PROMPT_TYPES).map(([type, data]) => ({
    type: type as PromptType,
    ...data,
  }));
}

/**
 * Get all industries
 */
export function getIndustries(): Industry[] {
  return Object.keys(INDUSTRY_CONTEXT).sort() as Industry[];
}

/**
 * Generate a template for AI prompt generation
 */
export function generateSystemPrompt(industry: Industry, promptType: PromptType, task: string): string {
  const typeInfo = PROMPT_TYPES[promptType];
  const industryContext = INDUSTRY_CONTEXT[industry];
  const template = TEMPLATE_EXAMPLES[promptType][industry];

  return `You are an expert prompt engineer specializing in the ${industry} domain.

Your task is to generate an optimized ${typeInfo.name} prompt.

Style Guide:
- ${industryContext}
- Make the prompt clear, structured, and actionable
- Include specific guidance on expected format/output
- Add constraints that ensure high-quality responses
- Keep it professional and direct

Example approach for this type:
${template}

Now, generate a ${typeInfo.name} prompt for this task:
${task}

Provide the complete prompt that should be sent to an LLM. Start with the actual prompt text, not explanations.`;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
}
