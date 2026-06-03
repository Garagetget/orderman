import { describe, expect, it } from "vitest";

import { PERMISSIONS, requiredPermissionForPath } from "./permissions";

describe("requiredPermissionForPath", () => {
  it("matches /order-history BEFORE the shorter /order prefix", () => {
    // Order matters: if /order were listed first it would shadow /order-history
    // and hand history pages the wrong (weaker) permission. Lock the ordering.
    expect(requiredPermissionForPath("/order-history")).toBe(
      PERMISSIONS.ORDER_HISTORY_VIEW,
    );
    expect(requiredPermissionForPath("/order-history/42")).toBe(
      PERMISSIONS.ORDER_HISTORY_VIEW,
    );
  });

  it("maps each gated route to its permission", () => {
    expect(requiredPermissionForPath("/order")).toBe(PERMISSIONS.ORDER_CREATE);
    expect(requiredPermissionForPath("/dashboard")).toBe(
      PERMISSIONS.DASHBOARD_VIEW,
    );
    expect(requiredPermissionForPath("/menu")).toBe(PERMISSIONS.MENU_MANAGE);
    expect(requiredPermissionForPath("/admin")).toBe(PERMISSIONS.USER_MANAGE);
    expect(requiredPermissionForPath("/admin/users")).toBe(
      PERMISSIONS.USER_MANAGE,
    );
  });

  it("matches sub-paths of a gated prefix", () => {
    expect(requiredPermissionForPath("/menu/edit/7")).toBe(
      PERMISSIONS.MENU_MANAGE,
    );
  });

  it("returns null for ungated paths", () => {
    expect(requiredPermissionForPath("/login")).toBeNull();
    expect(requiredPermissionForPath("/")).toBeNull();
  });

  it("does not over-match a prefix that is not a path segment", () => {
    // "/orderx" is not under the "/order" route — must not inherit its permission.
    expect(requiredPermissionForPath("/orderx")).toBeNull();
  });
});
