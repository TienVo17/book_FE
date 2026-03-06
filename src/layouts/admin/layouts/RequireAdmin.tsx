import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface Props {
}

interface JwtPayload {
    exp?: number;
    isAdmin?: boolean;
    isStaff?: boolean;
    isUser?: boolean;
}

const RequireAdmin = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
    const WithAdminCheck: React.FC<P> = (props) => {
        const navigate = useNavigate();
        useEffect(() => {
            const token = localStorage.getItem('jwt');
            if (!token) {
                navigate("/dang-nhap");
                return;
            }

            try {
                const decodedToken = jwtDecode<JwtPayload>(token);
                if (!decodedToken.exp || decodedToken.exp * 1000 <= Date.now()) {
                    localStorage.removeItem('jwt');
                    navigate("/dang-nhap");
                    return;
                }

                if (!decodedToken.isAdmin) {
                    navigate("/bao-loi-403");
                }
            } catch (error) {
                console.error('Invalid token:', error);
                localStorage.removeItem('jwt');
                navigate("/dang-nhap");
            }
        }, [navigate]);
        return <WrappedComponent {...props} />
    }
    return WithAdminCheck;
}

export default RequireAdmin;
