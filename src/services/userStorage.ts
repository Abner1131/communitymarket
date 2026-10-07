import AsyncStorage from "@react-native-async-storage/async-storage";

import type { User } from "../types/community";

const USERS_STORAGE_KEY =
  "@communitymarket/users";

const SESSION_STORAGE_KEY =
  "@communitymarket/auth-session";

export type AuthSession = {
  userId: string;
  createdAt: string;
};

export async function getUsers(): Promise<User[]> {
  const raw =
    await AsyncStorage.getItem(
      USERS_STORAGE_KEY
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export async function saveUser(
  user: User
): Promise<User> {
  const users = await getUsers();

  const existingIndex =
    users.findIndex(
      (item) => item.id === user.id
    );

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  await AsyncStorage.setItem(
    USERS_STORAGE_KEY,
    JSON.stringify(users)
  );

  return user;
}

export async function getUserById(
  userId: string
): Promise<User | undefined> {
  const users = await getUsers();

  return users.find(
    (user) => user.id === userId
  );
}

export async function getUserByPhone(
  phone: string
): Promise<User | undefined> {
  const normalizedPhone =
    phone.trim();

  if (!normalizedPhone) {
    return undefined;
  }

  const users = await getUsers();

  return users.find(
    (user) =>
      user.phone === normalizedPhone
  );
}

export async function saveAuthSession(
  session: AuthSession
): Promise<AuthSession> {
  await AsyncStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(session)
  );

  return session;
}

export async function getAuthSession(): Promise<
  AuthSession | undefined
> {
  const raw =
    await AsyncStorage.getItem(
      SESSION_STORAGE_KEY
    );

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed.userId !== "string" ||
      typeof parsed.createdAt !== "string"
    ) {
      return undefined;
    }

    return parsed as AuthSession;
  } catch {
    return undefined;
  }
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.removeItem(
    SESSION_STORAGE_KEY
  );
}