export interface AiMsg {
  role: 'ai' | 'user';
  text: string;
}

export interface ChipOption {
  label: string;
  industry: string;
  dept: string;
  confidence: number;
  isNew?: boolean;
}
