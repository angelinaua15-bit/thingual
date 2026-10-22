/** Free-tier limits (kept import-free so the store can use them). */
export const LIMITS = {
  aiScansPerDay: 10, // server recognition (on-device detection in the browser is unlimited)
  chatPerDay: 5, // AI conversation messages
  wordAiPerDay: 5, // AI help (association, transcription) for words in My vocabulary
  freeLanguages: 2,
  maxLanguages: 10,
  freeExprPerKind: 30, // phrasal verbs / collocations / idioms open in Free
  trialDays: 7,
  maxFreezesMonthly: 2,
};
