export interface MockSyllabusChecklistItem {
  id: string;
  code: string;
  title: string;
  unit: string;
  completed: boolean;
}

export interface DesignSystemShowcaseMockData {
  systemNameLight: string;
  systemNameDark: string;
  sampleSubjects: Array<{
    code: string;
    title: string;
    board: string;
    targetGrade: string;
    ums: string;
  }>;
  sampleChecklist: MockSyllabusChecklistItem[];
}

export const MOCK_DESIGN_SYSTEM_DATA: DesignSystemShowcaseMockData = {
  systemNameLight: 'The ANTs Academic System',
  systemNameDark: 'Amber Academic Studio',
  sampleSubjects: [
    {
      code: 'WMA11',
      title: 'Pure Mathematics 1',
      board: 'Pearson Edexcel IAL',
      targetGrade: 'A*',
      ums: '96 / 100',
    },
    {
      code: '9702',
      title: 'AS & A Level Physics',
      board: 'Cambridge International',
      targetGrade: 'A*',
      ums: '91%',
    },
    {
      code: '0580',
      title: 'IGCSE Extended Mathematics',
      board: 'Cambridge IGCSE',
      targetGrade: '9',
      ums: '188 / 200',
    },
  ],
  sampleChecklist: [
    {
      id: 'chk-1',
      code: 'WMA11.3',
      title: 'Coordinate geometry in the (x, y) plane',
      unit: 'Unit P1 · 18 past paper questions',
      completed: true,
    },
    {
      id: 'chk-2',
      code: 'WMA11.5',
      title: 'Trigonometric identities & radian measure',
      unit: 'Unit P1 · 24 past paper questions',
      completed: true,
    },
    {
      id: 'chk-3',
      code: 'WMA11.7',
      title: 'Differentiation & stationary points',
      unit: 'Unit P1 · 31 past paper questions',
      completed: false,
    },
  ],
};

