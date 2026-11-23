// @ants/calculator — Shared Grade Calculator engine, container & UI for the-ants.org/calculator & study.the-ants.org/calculator

export {
  AS_ALLOWED_GRADES,
  A_STAR_TO_E_ORDER,
  A_STAR_TO_G_ORDER,
  CORE_ALLOWED_GRADES,
  EDEXCEL_IAL_FM_CORE_UNITS,
  EDEXCEL_IAL_NO_OCT_NOV_UNITS,
  FOUNDATION_ALLOWED_GRADES,
  NINE_TO_ONE_ORDER,
  PEARSON_UMS_CONVERTER_URL,
  UMS_PUM_ANCHOR_PERCENT_BY_GRADE,
  buildEdexcelIgcseUmsBoundaries,
  calculateEdexcelMathsSuite,
  calculatePaperFromDirectUms,
  calculatePaperGrade,
  calculateRouteGrade,
  calculateSubjectGrade,
  deriveUnitGradeFromUms,
  evaluateAStarRule,
  expandLegacyPaperCutoffs,
  getGradeOrder,
  hasFurtherMathsUnits,
  isDirectUmsOnlySubject,
  isOctNovSeriesId,
  resolveEffectivePaperMaxRaw,
  sortBoundariesDescending,
  summarizeThresholdsToLegacyCutoffs,
  supportsDirectUms,
  type AStarRuleEvaluation,
  type CalculateEdexcelMathsSuiteParams,
  type CalculatePaperOptions,
  type CompositeGradeInputOptions,
  type EdexcelMathsAssignedAward,
  type EdexcelMathsAwardSummary,
  type EdexcelMathsSuiteResult,
  type EdexcelMathsUnitEvaluation,
  type EngineAStarRule,
  type EngineGradeThreshold,
  type EnginePaperInput,
  type EngineRouteInput,
  type EngineSubjectInput,
  type LegacyPaperCutoffs,
  type NextBoundaryHint,
  type PaperCalculationResult,
  type SubjectCalculationResult,
} from './engine';

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
  type CalculatorSaveFeedback,
  type CalculatorSeriesOption,
  type GradeCalculationSnapshot,
  type GradeCalculatorViewProps,
} from './views/GradeCalculatorView';

export {
  EDEXCEL_MATHS_SUITE_PRESETS,
  EdexcelMathsSuiteView,
  type EdexcelMathsSuiteViewProps,
} from './views/EdexcelMathsSuiteView';

export {
  GradeCalculatorContainer,
  type GradeCalculatorContainerProps,
} from './containers/GradeCalculatorContainer';
