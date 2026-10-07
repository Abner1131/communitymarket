import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  User,
  UserRole,
} from "../types/community";

import {
  authenticateUser,
  createUser,
  getUser,
  type CreateUserInput,
} from "../services/userService";

import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from "../services/userStorage";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  signIn: (
    phone: string
  ) => Promise<User>;

  signUp: (
    input: CreateUserInput
  ) => Promise<User>;

  signOut: () => Promise<void>;

  refreshUser: () => Promise<User | null>;

  hasRole: (
    role: UserRole
  ) => boolean;

  hasAnyRole: (
    roles: UserRole[]
  ) => boolean;
};

const AuthContext =
  createContext<
    AuthContextType | undefined
  >(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    void getAuthSession()
      .then(async (session) => {
        if (!active || !session) {
          return;
        }

        const storedUser =
          await getUser(
            session.userId
          );

        if (!active) {
          return;
        }

        if (!storedUser) {
          await clearAuthSession();
          return;
        }

        if (
          storedUser.status !==
          "active"
        ) {
          await clearAuthSession();
          return;
        }

        setUser(storedUser);
      })
      .catch((error) => {
        console.warn(
          "AUTH SESSION LOAD FAILED:",
          error
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function signIn(
    phone: string
  ): Promise<User> {
    const authenticatedUser =
      await authenticateUser({
        phone,
      });

    await saveAuthSession({
      userId:
        authenticatedUser.id,
      createdAt:
        new Date().toISOString(),
    });

    setUser(
      authenticatedUser
    );

    return authenticatedUser;
  }

  async function signUp(
    input: CreateUserInput
  ): Promise<User> {
    const newUser =
      await createUser(input);

    await saveAuthSession({
      userId: newUser.id,
      createdAt:
        new Date().toISOString(),
    });

    setUser(newUser);

    return newUser;
  }

  async function signOut(): Promise<void> {
    await clearAuthSession();
    setUser(null);
  }

  async function refreshUser(): Promise<User | null> {
    if (!user) {
      return null;
    }

    const refreshed =
      await getUser(user.id);

    if (!refreshed) {
      await clearAuthSession();
      setUser(null);
      return null;
    }

    if (
      refreshed.status !==
      "active"
    ) {
      await clearAuthSession();
      setUser(null);
      return null;
    }

    setUser(refreshed);

    return refreshed;
  }

  function hasRole(
    role: UserRole
  ): boolean {
    return (
      user?.role === role
    );
  }

  function hasAnyRole(
    roles: UserRole[]
  ): boolean {
    if (!user) {
      return false;
    }

    return roles.includes(
      user.role
    );
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated:
        user !== null,
      signIn,
      signUp,
      signOut,
      refreshUser,
      hasRole,
      hasAnyRole,
    }),
    [
      user,
      isLoading,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}