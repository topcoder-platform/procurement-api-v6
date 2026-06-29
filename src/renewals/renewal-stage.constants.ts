import { RenewalStage } from "@prisma/client";

export type RenewalStageTimestampField =
  | "quotationAt"
  | "vraAt"
  | "cioApprovalAt"
  | "legalReviewAt"
  | "orderFormSignedAt"
  | "prCreationAt"
  | "prApprovalsAt"
  | "poReleaseAt";

export type RenewalStageDefinition = {
  stage: RenewalStage;
  label: string;
  order: number;
  timestampField: RenewalStageTimestampField;
};

export const TERMINAL_RENEWAL_STAGE = RenewalStage.po_release;

export const RENEWAL_STAGE_DEFINITIONS: readonly RenewalStageDefinition[] = [
  {
    stage: RenewalStage.quotation,
    label: "Quotation",
    order: 1,
    timestampField: "quotationAt",
  },
  {
    stage: RenewalStage.vra,
    label: "VRA",
    order: 2,
    timestampField: "vraAt",
  },
  {
    stage: RenewalStage.cio_approval,
    label: "CIO Approval",
    order: 3,
    timestampField: "cioApprovalAt",
  },
  {
    stage: RenewalStage.legal_review,
    label: "Legal Review",
    order: 4,
    timestampField: "legalReviewAt",
  },
  {
    stage: RenewalStage.order_form_signed,
    label: "Order Form Signed",
    order: 5,
    timestampField: "orderFormSignedAt",
  },
  {
    stage: RenewalStage.pr_creation,
    label: "PR Creation",
    order: 6,
    timestampField: "prCreationAt",
  },
  {
    stage: RenewalStage.pr_approvals,
    label: "PR Approvals",
    order: 7,
    timestampField: "prApprovalsAt",
  },
  {
    stage: RenewalStage.po_release,
    label: "PO Release",
    order: 8,
    timestampField: "poReleaseAt",
  },
];

export const RENEWAL_STAGE_ORDER = RENEWAL_STAGE_DEFINITIONS.map(
  (definition) => definition.stage,
);

/**
 * Finds display and timestamp metadata for a renewal stage.
 *
 * @param stage Renewal stage enum value to look up.
 * @returns Stage definition when the stage is known, otherwise `undefined`.
 */
export function getRenewalStageDefinition(
  stage: RenewalStage,
): RenewalStageDefinition | undefined {
  return RENEWAL_STAGE_DEFINITIONS.find(
    (definition) => definition.stage === stage,
  );
}

/**
 * Returns the zero-based workflow index for a renewal stage.
 *
 * @param stage Renewal stage enum value to locate.
 * @returns Stage index in workflow order, or `-1` when unknown.
 */
export function getRenewalStageIndex(stage: RenewalStage): number {
  return RENEWAL_STAGE_ORDER.indexOf(stage);
}

/**
 * Checks whether a renewal transition moves exactly one step.
 *
 * @param currentStage Current persisted renewal stage.
 * @param targetStage Requested target renewal stage.
 * @returns `true` when the target is one step forward or one step backward.
 */
export function isAdjacentRenewalStageMove(
  currentStage: RenewalStage,
  targetStage: RenewalStage,
): boolean {
  const currentIndex = getRenewalStageIndex(currentStage);
  const targetIndex = getRenewalStageIndex(targetStage);

  return (
    currentIndex >= 0 &&
    targetIndex >= 0 &&
    Math.abs(targetIndex - currentIndex) === 1
  );
}

/**
 * Checks whether a renewal transition moves forward in the workflow.
 *
 * @param currentStage Current persisted renewal stage.
 * @param targetStage Requested target renewal stage.
 * @returns `true` when the target stage appears after the current stage.
 */
export function isForwardRenewalStageMove(
  currentStage: RenewalStage,
  targetStage: RenewalStage,
): boolean {
  return getRenewalStageIndex(targetStage) > getRenewalStageIndex(currentStage);
}
