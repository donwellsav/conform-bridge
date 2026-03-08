import type { AnalysisReport, SourceBundle, TranslationModel } from "@/lib/types";

export interface IntakeImportResult {
  translationModel: TranslationModel;
  analysisReport: AnalysisReport;
}

export interface ImporterService {
  normalizeIntake(bundle: SourceBundle): Promise<IntakeImportResult>;
}

export async function normalizeIntakeBundle(bundle: SourceBundle): Promise<IntakeImportResult> {
  void bundle;

  throw new Error("Importer stub only. Real Resolve intake parsing belongs to phase 2.");
}
