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

function GioHang() {
    const [gioHang, setGioHang] = useState<SanPhamGioHang[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        const loadGioHangWithImages = async () => {
            const gioHangData = localStorage.getItem('gioHang');
            if (gioHangData) {
                const parsedGioHang = JSON.parse(gioHangData);
                
                const gioHangWithImages = await Promise.all(
                    parsedGioHang.map(async (item: SanPhamGioHang) => {
                        try {
                            const images = await getOneImageOfOneBook(item.maSach);
                            return {
                                ...item,
                                hinhAnh: images[0]?.urlHinh || ''
                            };
                        } catch (error) {
                            console.error('Error loading image:', error);
                            return item;
                        }
                    })
                );
                
                setGioHang(gioHangWithImages);
            }
        };

        loadGioHangWithImages();
    }, []);

    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm">
                        <div className="card-header bg-dark text-white">
                            <h4 className="mb-0">Giỏ hàng của bạn</h4>
                        </div>
                        <div className="card-body">
                            {gioHang.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                                    <h5 className="text-muted">Giỏ hàng trống</h5>
                                    <Link to="/" className="btn bg-dark mt-3">
                                        Tiếp tục mua sắm
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th scope="col" style={{ width: '100px' }}>Hình ảnh</th>
                                                    <th scope="col">Tên sách</th>
                                                    <th scope="col" className="text-end">Đơn giá</th>
                                                    <th scope="col" className="text-center" style={{ width: '150px' }}>Số lượng</th>
                                                    <th scope="col" className="text-end">Thành tiền</th>
                                                    <th scope="col" style={{ width: '100px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gioHang.map((item) => (
                                                    <tr key={item.maSach}>
                                                        <td>
                                                            <img 
                                                                src={item.hinhAnh || item.sachDto.hinhAnh} 
                                                                alt={item.sachDto.tenSach} 
                                                                className="img-fluid rounded"
                                                                style={{maxWidth: '80px'}}
                                                            />
                                                        </td>
                                                        <td>
                                                            <h6 className="mb-0">{item.sachDto.tenSach}</h6>
                                                        </td>
                                                        <td className="text-end">
                                                            {item.sachDto.giaBan.toLocaleString()}đ
                                                        </td>
                                                        <td>
                                                            <div className="d-flex justify-content-center align-items-center">
                                                                <button 
                                                                    className="btn btn-sm btn-outline-secondary"
                                                                    onClick={() => {
                                                                        if (item.soLuong > 1) {
                                                                            const newGioHang = gioHang.map(sp => 
                                                                                sp.maSach === item.maSach 
                                                                                    ? {...sp, soLuong: sp.soLuong - 1}
                                                                                    : sp
                                                                            );
                                                                            setGioHang(newGioHang);
                                                                            localStorage.setItem('gioHang', JSON.stringify(newGioHang));
                                                                        }
                                                                    }}
                                                                >-</button>
                                                                <input
                                                                    className="form-control form-control-sm text-center mx-2"
                                                                    style={{width: '50px'}}
                                                                    type="number"
                                                                    value={item.soLuong}
                                                                    min={1}
                                                                    onChange={(e) => {
                                                                        const soLuongMoi = parseInt(e.target.value);
                                                                        if (!isNaN(soLuongMoi) && soLuongMoi >= 1) {
                                                                            const newGioHang = gioHang.map(sp =>
                                                                                sp.maSach === item.maSach
                                                                                    ? {...sp, soLuong: soLuongMoi}
                                                                                    : sp
                                                                            );
                                                                            setGioHang(newGioHang);
                                                                            localStorage.setItem('gioHang', JSON.stringify(newGioHang));
                                                                        }
                                                                    }}
                                                                />
                                                                <button 
                                                                    className="btn btn-sm btn-outline-secondary"
                                                                    onClick={() => {
                                                                        const newGioHang = gioHang.map(sp =>
                                                                            sp.maSach === item.maSach
                                                                                ? {...sp, soLuong: sp.soLuong + 1}
                                                                                : sp
                                                                        );
                                                                        setGioHang(newGioHang);
                                                                        localStorage.setItem('gioHang', JSON.stringify(newGioHang));
                                                                    }}
                                                                >+</button>
                                                            </div>
                                                        </td>
                                                        <td className="text-end fw-bold">
                                                            {(item.sachDto.giaBan * item.soLuong).toLocaleString()}đ
                                                        </td>
                                                        <td>
                                                            <button 
                                                                className="btn btn-outline-danger btn-sm"
                                                                onClick={() => {
                                                                    const newGioHang = gioHang.filter(
                                                                        (sp) => sp.maSach !== item.maSach
                                                                    );
                                                                    setGioHang(newGioHang);
                                                                    localStorage.setItem('gioHang', JSON.stringify(newGioHang));
                                                                    window.dispatchEvent(new Event('storage'));
                                                                }}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="card mt-4">
                                        <div className="card-body">
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <Link to="/" className="btn btn-outline-primary">
                                                        <i className="fas fa-arrow-left me-2"></i>
                                                        Tiếp tục mua sắm
                                                    </Link>
                                                </div>
                                                <div className="col-md-6 text-end">
                                                    <div className="h5 mb-3">
                                                        Tổng thanh toán: <span className="text-primary">
                                                            {gioHang.reduce((total, item) => total + item.sachDto.giaBan * item.soLuong, 0).toLocaleString()}đ
                                                        </span>
                                                    </div>
                                                    <button className="btn bg-dark text-white"
                                                        onClick={()=>{
                                                            // eslint-disable-next-line no-restricted-globals
                                                            if(localStorage.getItem('jwt')){
                                                                navigate(`/thanh-toan`);
                                                            }else{
                                                                // eslint-disable-next-line no-restricted-globals
                                                                const result = confirm("Bạn có muốn đăng nhập để thanh toán ?");
                                                                if (result) {
                                                                // Thực hiện hành động nếu người dùng bấm "OK
                                                                     localStorage.setItem('nextPay',"true")
                                                                     navigate(`/dang-nhap`);
                                                                } 
                                                            }
                                                            
                                                        }}
                                                    >
                                                        Thanh toán ngay
                                                        <i className="fas fa-arrow-right ms-2"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GioHang;