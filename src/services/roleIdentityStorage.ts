import AsyncStorage from "@react-native-async-storage/async-storage";

import type { UserRole } from "../types/community";

const ROLE_LINKS_STORAGE_KEY =
  "@communitymarket/role-links";

export type RoleIdentityLink = {
  userId: string;
  role: "seller" | "rider";
  entityId: string;
  createdAt: string;
  updatedAt: string;
};

export async function getRoleIdentityLinks(): Promise<
  RoleIdentityLink[]
> {
  const raw =
    await AsyncStorage.getItem(
      ROLE_LINKS_STORAGE_KEY
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

export async function saveRoleIdentityLink(
  link: RoleIdentityLink
): Promise<RoleIdentityLink> {
  const links =
    await getRoleIdentityLinks();

  const existingIndex =
    links.findIndex(
      (item) =>
        item.userId === link.userId
    );

  if (existingIndex >= 0) {
    links[existingIndex] = link;
  } else {
    links.push(link);
  }

  await AsyncStorage.setItem(
    ROLE_LINKS_STORAGE_KEY,
    JSON.stringify(links)
  );

  return link;
}

export async function getRoleIdentityLinkByUserId(
  userId: string
): Promise<
  RoleIdentityLink | undefined
> {
  const links =
    await getRoleIdentityLinks();

  return links.find(
    (link) =>
      link.userId === userId
  );
}

export async function getRoleIdentityLinkByEntityId(
  role: "seller" | "rider",
  entityId: string
): Promise<
  RoleIdentityLink | undefined
> {
  const links =
    await getRoleIdentityLinks();

  return links.find(
    (link) =>
      link.role === role &&
      link.entityId === entityId
  );
}

export async function removeRoleIdentityLink(
  userId: string
): Promise<void> {
  const links =
    await getRoleIdentityLinks();

  const filtered =
    links.filter(
      (link) =>
        link.userId !== userId
    );

  await AsyncStorage.setItem(
    ROLE_LINKS_STORAGE_KEY,
    JSON.stringify(filtered)
  );
}

export function isLinkableRole(
  role: UserRole
): role is "seller" | "rider" {
  return (
    role === "seller" ||
    role === "rider"
  );
}