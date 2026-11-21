// @ants/calculator — Shared Grade Calculator engine & UI for the-ants.org/calculator & study.the-ants.org/calculator

export {
  MOCK_CALCULATOR_SUBJECTS,
  MOCK_EXAM_BOARDS,
  MOCK_EXAM_SERIES,
  type CalculatorSubjectMock,
  type ExamBoardId,
  type ExamBoardOption,
  type ExamSeriesId,
  type ExamSeriesOption,
  type GradeThreshold,
  type PaperComponentMock,
} from './mocks/calculator.mock';

export {
  GradeCalculatorView,
  type GradeCalculationSnapshot,
  type GradeCalculatorViewProps,
} from './views/GradeCalculatorView';
