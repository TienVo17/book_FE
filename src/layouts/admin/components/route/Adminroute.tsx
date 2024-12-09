import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
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
    // Giải mã token JWT
    const decoded = jwtDecode<JwtPayload>(jwt);
    console.log(decoded);  // In ra payload để kiểm tra

    // Kiểm tra nếu là ADMIN hoặc STAFF
    if (!(decoded.isAdmin || decoded.isStaff)) {
      return <Navigate to="/" />;
    }

    return children;  // Cho phép truy cập nếu là ADMIN hoặc STAFF
  } catch (error) {
    console.error('Invalid token:', error);
    return <Navigate to="/dang-nhap" />;
  }
};

export default AdminRoute;
