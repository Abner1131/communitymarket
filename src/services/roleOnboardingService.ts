import { riders } from "../data/riders";
import { sellers } from "../data/sellers";
import type { User } from "../types/community";
import {
  getLinkedEntityForUser,
  getLinkedUserForEntity,
  linkRiderToUser,
  linkSellerToUser,
} from "./roleIdentityService";

export async function getAvailableSellerEntities() {
  const links = await Promise.all(
    sellers.map((seller) =>
      getLinkedUserForEntity("seller", seller.id),
    ),
  );

  return sellers.filter((_, index) => !links[index]);
}

export async function getAvailableRiderEntities() {
  const links = await Promise.all(
    riders.map((rider) =>
      getLinkedUserForEntity("rider", rider.id),
    ),
  );

  return riders.filter((_, index) => !links[index]);
}

export async function getUserRoleEntity(userId: string) {
  return getLinkedEntityForUser(userId);
}

export async function completeSellerOnboarding(
  user: User,
  sellerId: string,
) {
  return linkSellerToUser(user, sellerId);
}

export async function completeRiderOnboarding(
  user: User,
  riderId: string,
) {
  return linkRiderToUser(user, riderId);
}