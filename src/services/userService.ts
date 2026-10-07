import type {
  User,
  UserRole,
  UserStatus,
} from "../types/community";

import {
  getUserById,
  getUserByPhone,
  saveUser,
} from "./userStorage";

export type CreateUserInput = {
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
};

export type SignInInput = {
  phone: string;
};

function createUserId(): string {
  return `USR${Date.now()}${Math.floor(
    Math.random() * 1000
  )}`;
}

function normalizePhone(
  phone: string
): string {
  return phone.trim();
}

function normalizeName(
  name: string
): string {
  return name.trim();
}

function normalizeEmail(
  email: string | undefined
): string | undefined {
  const normalized =
    email?.trim();

  return normalized
    ? normalized
    : undefined;
}

export function validateCreateUserInput(
  input: CreateUserInput
): void {
  if (!input) {
    throw new Error(
      "User input is required."
    );
  }

  if (!normalizeName(input.name)) {
    throw new Error(
      "Name is required."
    );
  }

  if (!normalizePhone(input.phone)) {
    throw new Error(
      "Phone number is required."
    );
  }

  if (!input.role) {
    throw new Error(
      "User role is required."
    );
  }
}

export async function createUser(
  input: CreateUserInput
): Promise<User> {
  validateCreateUserInput(
    input
  );

  const phone =
    normalizePhone(input.phone);

  const existing =
    await getUserByPhone(phone);

  if (existing) {
    throw new Error(
      "A user with this phone number already exists."
    );
  }

  const now =
    new Date().toISOString();

  const user: User = {
    id: createUserId(),
    name: normalizeName(
      input.name
    ),
    phone,
    email: normalizeEmail(
      input.email
    ),
    role: input.role,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await saveUser(user);

  return user;
}

export async function authenticateUser(
  input: SignInInput
): Promise<User> {
  if (!input) {
    throw new Error(
      "Sign-in information is required."
    );
  }

  const phone =
    normalizePhone(input.phone);

  if (!phone) {
    throw new Error(
      "Phone number is required."
    );
  }

  const user =
    await getUserByPhone(phone);

  if (!user) {
    throw new Error(
      "No account was found for this phone number."
    );
  }

  if (user.status !== "active") {
    throw new Error(
      `User account is ${user.status}.`
    );
  }

  return user;
}

export async function getUser(
  userId: string
): Promise<User | undefined> {
  if (!userId.trim()) {
    return undefined;
  }

  return getUserById(userId);
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<User> {
  const user =
    await getUserById(userId);

  if (!user) {
    throw new Error(
      "User not found."
    );
  }

  const updatedUser: User = {
    ...user,
    status,
    updatedAt:
      new Date().toISOString(),
  };

  await saveUser(updatedUser);

  return updatedUser;
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<User> {
  const user =
    await getUserById(userId);

  if (!user) {
    throw new Error(
      "User not found."
    );
  }

  const updatedUser: User = {
    ...user,
    role,
    updatedAt:
      new Date().toISOString(),
  };

  await saveUser(updatedUser);

  return updatedUser;
}