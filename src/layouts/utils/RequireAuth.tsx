import React from 'react';
import { Navigate } from 'react-router-dom';

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    return <Navigate to="/dang-nhap" />;
  }
  return children;
};
