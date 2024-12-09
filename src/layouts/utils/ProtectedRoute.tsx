import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const jwt = localStorage.getItem('jwt');
    
    if (jwt) {
        return <Navigate to="/" />;
    }
    
    return children;
}; 