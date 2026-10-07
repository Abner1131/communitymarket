import {
  getLinkedEntityForUser,
  getLinkedUserForEntity,
  linkRiderToUser,
  linkSellerToUser,
  unlinkUserFromRoleEntity,
} from "./roleIdentityService";

import type { User } from "../types/community";

/*
 * Node/tsx test shim for AsyncStorage's web implementation.
 */
const storage =
  new Map<string, string>();

globalThis.window = {
  localStorage: {
    getItem: (
      key: string
    ) =>
      storage.has(key)
        ? storage.get(key)!
        : null,

    setItem: (
      key: string,
      value: string
    ) => {
      storage.set(
        key,
        value
      );
    },

    removeItem: (
      key: string
    ) => {
      storage.delete(key);
    },
  },
} as any;

const sellerUser: User = {
  id: "USR-7-4-SELLER",
  name: "Test Seller",
  phone: "08000000001",
  role: "seller",
  status: "active",
  createdAt:
    "2026-01-01T00:00:00.000Z",
  updatedAt:
    "2026-01-01T00:00:00.000Z",
};

const riderUser: User = {
  id: "USR-7-4-RIDER",
  name: "Test Rider",
  phone: "08000000002",
  role: "rider",
  status: "active",
  createdAt:
    "2026-01-01T00:00:00.000Z",
  updatedAt:
    "2026-01-01T00:00:00.000Z",
};

async function run() {
  console.log(
    "=== 7.4 ROLE IDENTITY TEST START ==="
  );

  const sellerLink =
    await linkSellerToUser(
      sellerUser,
      "SELLER003"
    );

  if (
    sellerLink.entityId !==
    "SELLER003"
  ) {
    throw new Error(
      "Seller link failed."
    );
  }

  const riderLink =
    await linkRiderToUser(
      riderUser,
      "R002"
    );

  if (
    riderLink.entityId !==
    "R002"
  ) {
    throw new Error(
      "Rider link failed."
    );
  }

  const sellerLookup =
    await getLinkedEntityForUser(
      sellerUser.id
    );

  if (
    sellerLookup?.entityId !==
    "SELLER003"
  ) {
    throw new Error(
      "Seller user lookup failed."
    );
  }

  const riderLookup =
    await getLinkedEntityForUser(
      riderUser.id
    );

  if (
    riderLookup?.entityId !==
    "R002"
  ) {
    throw new Error(
      "Rider user lookup failed."
    );
  }

  const sellerOwner =
    await getLinkedUserForEntity(
      "seller",
      "SELLER003"
    );

  if (
    sellerOwner?.userId !==
    sellerUser.id
  ) {
    throw new Error(
      "Seller entity lookup failed."
    );
  }

  const riderOwner =
    await getLinkedUserForEntity(
      "rider",
      "R002"
    );

  if (
    riderOwner?.userId !==
    riderUser.id
  ) {
    throw new Error(
      "Rider entity lookup failed."
    );
  }

  await unlinkUserFromRoleEntity(
    sellerUser.id
  );

  const removedSeller =
    await getLinkedEntityForUser(
      sellerUser.id
    );

  if (removedSeller) {
    throw new Error(
      "Seller link was not removed."
    );
  }

  await unlinkUserFromRoleEntity(
    riderUser.id
  );

  const removedRider =
    await getLinkedEntityForUser(
      riderUser.id
    );

  if (removedRider) {
    throw new Error(
      "Rider link was not removed."
    );
  }

  console.log(
    "SELLER LINK:",
    sellerLink.userId,
    "→",
    sellerLink.entityId
  );

  console.log(
    "RIDER LINK:",
    riderLink.userId,
    "→",
    riderLink.entityId
  );

  console.log(
    "SELLER LOOKUP: PASS"
  );

  console.log(
    "RIDER LOOKUP: PASS"
  );

  console.log(
    "UNLINK: PASS"
  );

  console.log(
    "=== 7.4 TEST PASSED ==="
  );
}

run().catch((error) => {
  console.error(
    "=== 7.4 TEST FAILED ==="
  );

  console.error(error);

  process.exit(1);
});