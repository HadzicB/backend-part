// What the API may show about a user
export type User = {
  id: number;
  username: string; // holds the email the user types at signup/login
};

// A users row as the repository reads it for login. Never send this to the client.
export type UserWithPassword = User & {
  password_hash: string; // "salt:hash"
};
