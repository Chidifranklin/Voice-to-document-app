export type DocumentTemplate =
  | 'Meeting Notes'
  | 'Lecture Notes'
  | 'Memo'
  | 'Letter'
  | 'Journal';

export interface VoiceDocument {
  id: string;
  userId: string;
  title: string;
  template: DocumentTemplate | string;
  transcript: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDefinition {
  id: DocumentTemplate;
  name: string;
  description: string;
  iconName: string;
  examplePrompt: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'Meeting Notes',
    name: 'Meeting Notes',
    description: 'Executive summary, key discussion points, decisions made, and assigned action items.',
    iconName: 'Users',
    examplePrompt: 'Include context, attendee items, decisions, and clear next steps.',
  },
  {
    id: 'Lecture Notes',
    name: 'Lecture Notes',
    description: 'Structured study guide with core concepts, detailed breakdowns, and review questions.',
    iconName: 'GraduationCap',
    examplePrompt: 'Highlight core definitions, examples, and study summary.',
  },
  {
    id: 'Memo',
    name: 'Memo',
    description: 'Formal business memorandum with TO/FROM header, problem statement, and recommendations.',
    iconName: 'FileText',
    examplePrompt: 'Standard corporate memorandum layout with clear next steps.',
  },
  {
    id: 'Letter',
    name: 'Letter',
    description: 'Polite, well-flowing formal or personal letter with professional greetings and sign-off.',
    iconName: 'Mail',
    examplePrompt: 'Well-crafted paragraphs with formal salutation and sign-off.',
  },
  {
    id: 'Journal',
    name: 'Journal',
    description: 'Personal daily log, mood & reflections, lessons learned, and intentions for tomorrow.',
    iconName: 'BookHeart',
    examplePrompt: 'Reflective tone, capturing honest thoughts and intentions.',
  },
];
