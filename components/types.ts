export type AuthMode = "login" | "signup";

export type AuthUser = {
  name: string;
  email: string;
};

export type AuthSubmitPayload = {
  mode: AuthMode;
  username: string;
  email: string;
  password: string;
  remember: boolean;
};
