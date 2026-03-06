import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp?: number;
  isAdmin?: boolean;
  isStaff?: boolean;
  isUser?: boolean;
}

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const jwt = localStorage.getItem('jwt');

  if (!jwt) {
    return <Navigate to="/dang-nhap" />;
  }

  try {
    const decoded = jwtDecode<JwtPayload>(jwt);
    if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
      localStorage.removeItem('jwt');
      return <Navigate to="/dang-nhap" />;
    }

    if (!(decoded.isAdmin || decoded.isStaff)) {
      return <Navigate to="/" />;
    }

    return children;
  } catch (error) {
    console.error('Invalid token:', error);
    localStorage.removeItem('jwt');
    return <Navigate to="/dang-nhap" />;
  }
};

export default AdminRoute;
