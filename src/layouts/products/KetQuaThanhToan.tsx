import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOneImageOfOneBook } from '../../api/HinhAnhApi';

interface SanPhamGioHang {
    maSach: number;
    sachDto: {
        tenSach: string;
        giaBan: number;
        hinhAnh: string;
    };
    soLuong: number;
    hinhAnh?: string;
}

function KetQuaThanhToan() {
    const [trangThai, setTrangThai] = useState<boolean>(false);
    const navigate = useNavigate();
    useEffect(() => {
        // Lấy phần chuỗi sau dấu "?" trong URL
        const queryString = window.location.search;

        // In chuỗi tham số ra console
        console.log(queryString);       

        fetch("http://localhost:8080/api/don-hang/vnpay-payment"+queryString, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
            },
        })
        .then((response) => response.text())  // Nếu API trả về chuỗi JSON, dùng .json()
        .then((data) => {
            if(data ==="ordersuccess"){
                setTrangThai(true);
            }else{
                setTrangThai(false);
            }
        })
        .catch((error) => {
            console.error("Lỗi:", error);
        });
    }, []); 

    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm">
                        <div className="card-header bg-dark text-white">
                            <h4 className="mb-0">Trạng thái thanh toán của đơn hàng</h4>
                        </div>
                        <div className="card-body" style={{display:'flex',justifyContent:'center'}}>
                            <div>
                            {trangThai ? (
                                <img src="/image/susses.png" alt="Success" />
                            ) : (
                                <img src="/image/download.png" alt="Download" />
                               
                            )}
                             {trangThai ? (
                                <h1>Thanh toán thành công</h1>
                            ) : (
                                <h1>Thanh toán thất bại</h1>
                               
                            )}
                            </div>
                        
                            
                           
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default KetQuaThanhToan;