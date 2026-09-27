type DatabaseFailure = {
  code?: string | null;
};

/**
 * Removes the patient created for an intake request when its dependent
 * submission could not be created. The caller supplies the narrowly scoped
 * delete so this helper never has access to intake data.
 */
export async function cleanupNewPatientAfterSubmissionFailure(
  deletePatient: () => PromiseLike<{ error: DatabaseFailure | null }>,
) {
  const { error } = await deletePatient();
  return error;
}

/**
 * Keep operational diagnostics useful without emitting form values, patient
 * identifiers, credentials, or database error text that could contain them.
 */
export function submissionFailureDiagnostic(
  submissionError: DatabaseFailure,
  cleanupError: DatabaseFailure | null,
) {
  return {
    operation: "submission_insert",
    databaseCode: submissionError.code ?? "unknown",
    cleanupSucceeded: cleanupError === null,
    cleanupDatabaseCode: cleanupError?.code ?? null,
  };
}
