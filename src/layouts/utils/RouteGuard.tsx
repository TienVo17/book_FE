import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { clearAuthenticatedSessionState } from "../../api/SessionCleanup";

interface JwtPayload {
  exp?: number;
  isAdmin?: boolean;
  isStaff?: boolean;
  isUser?: boolean;
}

export type RouteGuardRequirement = "user" | "admin";

interface RouteGuardProps {
  children: JSX.Element;
  require: RouteGuardRequirement;
}

interface GuardDecision {
  allowed: boolean;
  redirectTo?: string;
}

/**
 * Reads the JWT from localStorage and validates presence, structure and
 * expiry. Any token that cannot be trusted (missing, malformed or expired)
 * is cleared so a stale/broken token never lingers in storage.
 */
function readValidPayload(): JwtPayload | null {
  const token = localStorage.getItem("jwt");
  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
      clearAuthenticatedSessionState(true);
      return null;
    }
    return decoded;
  } catch {
    clearAuthenticatedSessionState(true);
    return null;
  }
}

function evaluate(require: RouteGuardRequirement): GuardDecision {
  const payload = readValidPayload();

  if (!payload) {
    return { allowed: false, redirectTo: "/dang-nhap" };
  }

  if (require === "admin" && payload.isAdmin !== true) {
    // A valid token that simply lacks admin privilege (including a
    // staff-only token) must never enter the admin area.
    return { allowed: false, redirectTo: "/" };
  }

  return { allowed: true };
}

/**
 * Single route guard covering both the "valid non-expired JWT" (user) and
 * "isAdmin === true" (admin) policies. Frontend guards are UX only; the
 * backend remains the authoritative security boundary.
 */
const RouteGuard: React.FC<RouteGuardProps> = ({ children, require }) => {
  const decision = evaluate(require);

  if (!decision.allowed) {
    return <Navigate to={decision.redirectTo ?? "/dang-nhap"} replace />;
  }

  return children;
};

export default RouteGuard;
