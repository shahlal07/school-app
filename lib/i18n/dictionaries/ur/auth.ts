/**
 * Urdu translations for the auth-page dictionary. Must implement exactly
 * the same key shape as dictionaries/en/auth.ts.
 */
const auth = {
  signInToYourAccount: "اپنے اکاؤنٹ میں سائن ان کریں",
  usernameOrEmailLabel: "یوزر نیم یا ای میل",
  usernameOrEmailRequired: "یوزر نیم یا ای میل درج کرنا ضروری ہے۔",
  passwordLabel: "پاس ورڈ",
  passwordRequired: "پاس ورڈ درج کرنا ضروری ہے۔",
  dismissError: "پیغام بند کریں",
  signIn: "سائن ان کریں",
  unableToSignIn: "سائن ان نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
  genericSignInError: "سائن ان نہیں ہو سکا۔",
  accountNotActive: "یہ اکاؤنٹ فعال نہیں ہے۔ براہِ کرم اسکول کے مالک سے رابطہ کریں۔"
} as const;

export default auth;
