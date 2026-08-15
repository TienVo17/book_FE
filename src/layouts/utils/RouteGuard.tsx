import React from "react";
import { Navigate } from "react-router-dom";
import { bootstrapAuth, getAuthSnapshot, useAuthSession } from "../../api/AuthSession";

export type RouteGuardRequirement = "user" | "admin";

interface RouteGuardProps {
  children: JSX.Element;
  require: RouteGuardRequirement;
}

function hasAdminCapability(): boolean {
  const snapshot = getAuthSnapshot();
  return snapshot.status === "authenticated" && snapshot.capabilities.includes("ADMIN");
}

/**
 * Route policy reads the session boundary only. Unknown is deliberately not
 * redirected: bootstrap must settle before private routes decide whether the
 * visitor is a guest.
 */
const RouteGuard: React.FC<RouteGuardProps> = ({ children, require }) => {
  const auth = useAuthSession();

  if (auth.status === "unknown") {
    return <div role="status" aria-live="polite">
      Đang xác thực…{' '}
      <button type="button" onClick={() => { void bootstrapAuth().catch(() => undefined); }}>
        Thử lại
      </button>
    </div>;
  }

  if (auth.status === "guest") {
    return <Navigate to="/dang-nhap" replace />;
  }

  if (require === "admin" && !hasAdminCapability()) {
    return <Navigate to="/" replace />;
  }

  return React.cloneElement(children, {
    key: `account:${auth.uid}`,
  });
};

export default RouteGuard;
