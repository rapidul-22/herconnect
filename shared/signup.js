// Exact domains only. This does not verify mailbox ownership.
export const signupDomains = ['gmail.com', 'herconnect.local', 'herconnect.demo'];
export const signupEmailMessage = 'Use gmail.com, herconnect.local or herconnect.demo for a new account.';
export const allowedSignupEmail = value => typeof value === 'string' &&
  signupDomains.includes(value.trim().toLowerCase().split('@')[1]) &&
  value.trim().split('@').length === 2;
