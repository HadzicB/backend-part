import type { User } from "../users/users.types.js";

// Field errors, e.g. { email: ["Enter a valid email"] }
export type FieldErrors = Record<string, string[]>;

// JSON body of POST /login and POST /signup. unknown because the client can send anything.
export type CredentialsBody = {
  email?: unknown;
  password?: unknown;
};

export type Session = {
  id: string;
  expiresAt: Date;
};

// The service never picks HTTP statuses: `reason` tells the controller which one to use.
export type SignupResult =
  | { reason: "validation" | "duplicate"; errors: FieldErrors; user?: undefined }
  | { reason?: undefined; user: User };

export type LoginResult = {
  user: User;
  session: Session;
};
