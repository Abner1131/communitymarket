import type {
  User,
  UserRole,
} from "../types/community";

import {
  getRoleIdentityLinkByEntityId,
  getRoleIdentityLinkByUserId,
  isLinkableRole,
  removeRoleIdentityLink,
  saveRoleIdentityLink,
  type RoleIdentityLink,
} from "./roleIdentityStorage";

function validateUser(
  user: User
): void {
  if (!user) {
    throw new Error(
      "User is required."
    );
  }

  if (!user.id.trim()) {
    throw new Error(
      "User ID is required."
    );
  }
}

function validateEntityId(
  entityId: string
): void {
  if (!entityId.trim()) {
    throw new Error(
      "Entity ID is required."
    );
  }
}

export async function linkUserToRoleEntity(
  user: User,
  entityId: string
): Promise<RoleIdentityLink> {
  validateUser(user);
  validateEntityId(entityId);

  if (
    !isLinkableRole(user.role)
  ) {
    throw new Error(
      `Role "${user.role}" cannot be linked to a seller or rider entity.`
    );
  }

  const existingUserLink =
    await getRoleIdentityLinkByUserId(
      user.id
    );

  if (
    existingUserLink &&
    existingUserLink.entityId !==
      entityId
  ) {
    throw new Error(
      "This user is already linked to another role entity."
    );
  }

  const existingEntityLink =
    await getRoleIdentityLinkByEntityId(
      user.role,
      entityId
    );

  if (
    existingEntityLink &&
    existingEntityLink.userId !==
      user.id
  ) {
    throw new Error(
      `This ${user.role} entity is already linked to another user.`
    );
  }

  const now =
    new Date().toISOString();

  return saveRoleIdentityLink({
    userId: user.id,
    role: user.role,
    entityId,
    createdAt:
      existingUserLink?.createdAt ??
      now,
    updatedAt: now,
  });
}

export async function linkSellerToUser(
  user: User,
  sellerId: string
): Promise<RoleIdentityLink> {
  if (user.role !== "seller") {
    throw new Error(
      "Only seller users can be linked to seller entities."
    );
  }

  return linkUserToRoleEntity(
    user,
    sellerId
  );
}

export async function linkRiderToUser(
  user: User,
  riderId: string
): Promise<RoleIdentityLink> {
  if (user.role !== "rider") {
    throw new Error(
      "Only rider users can be linked to rider entities."
    );
  }

  return linkUserToRoleEntity(
    user,
    riderId
  );
}

export async function getLinkedEntityForUser(
  userId: string
): Promise<
  RoleIdentityLink | undefined
> {
  if (!userId.trim()) {
    return undefined;
  }

  return getRoleIdentityLinkByUserId(
    userId
  );
}

export async function getLinkedUserForEntity(
  role: "seller" | "rider",
  entityId: string
): Promise<
  RoleIdentityLink | undefined
> {
  if (!entityId.trim()) {
    return undefined;
  }

  return getRoleIdentityLinkByEntityId(
    role,
    entityId
  );
}

export async function unlinkUserFromRoleEntity(
  userId: string
): Promise<void> {
  if (!userId.trim()) {
    throw new Error(
      "User ID is required."
    );
  }

  await removeRoleIdentityLink(
    userId
  );
}

export function canManageRoleEntity(
  user: User | null,
  role: UserRole,
  entityId: string,
  link:
    | RoleIdentityLink
    | undefined
): boolean {
  if (
    !user ||
    !entityId.trim()
  ) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (
    user.role !== role
  ) {
    return false;
  }

  return (
    link?.userId === user.id &&
    link.entityId === entityId
  );
}