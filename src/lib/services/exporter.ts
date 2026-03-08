import type { DeliveryPackage, OutputPreset, TranslationJob, TranslationModel } from "@/lib/types";

export interface DeliveryPlanResult {
  deliveryPackage: DeliveryPackage;
}

export interface ExporterService {
  planDelivery(job: TranslationJob, translationModel: TranslationModel, outputPreset: OutputPreset): Promise<DeliveryPlanResult>;
}

export async function planNuendoDelivery(
  job: TranslationJob,
  translationModel: TranslationModel,
  outputPreset: OutputPreset,
): Promise<DeliveryPlanResult> {
  void job;
  void translationModel;
  void outputPreset;

  throw new Error("Exporter stub only. Real Nuendo delivery writing belongs to phase 2.");
}
