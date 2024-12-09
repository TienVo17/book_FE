import React, { useEffect, useState } from "react";
import DanhGiaModel from "../../../models/DanhGiaModel";
import { getAllReviewOfOneBook } from "../../../api/DanhGiaAPI";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";



interface DanhGiaSanPhamProps {
  maSach: number;
}

export const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="stars d-inline-block">
      {[...Array(fullStars)].map((_, index) => (
        <i key={`full-${index}`} className="fas fa-star text-warning"></i>
      ))}
      {halfStar && <i className="fas fa-star-half-alt text-warning"></i>}
      {[...Array(emptyStars)].map((_, index) => (
        <i key={`empty-${index}`} className="far fa-star text-warning"></i>
      ))}
    </div>
  );
};

const renderStarOptions = () => {
  return [5, 4, 3, 2, 1].map((rating) => (
    <option key={rating} value={rating}>
      {rating} sao
    </option>
  ));
};



const DanhGiaSanPham: React.FC<DanhGiaSanPhamProps> = ({ maSach }) => {
  const [danhSachDanhGia, setDanhSachDanhGia] = useState<DanhGiaModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [danhGiaMoi, setDanhGiaMoi] = useState({
    diemXepHang: 5,
    nhanXet: "",
    maSach:0
  });
  const [dangGuiDanhGia, setDangGuiDanhGia] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getAllReviewOfOneBook(maSach)
      .then((danhGia) => {
        setDanhSachDanhGia(danhGia);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        setDangTaiDuLieu(false);
        setBaoLoi(error.message);
      });
  }, [maSach]);

  

  if (dangTaiDuLieu) {
    return (
      <div className="text-center my-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (baoLoi) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-circle me-2"></i>
        {baoLoi}
      </div>
    );
  }

 



  return (
    <div className="review-section my-4">
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="mb-3">Đánh giá sản phẩm</h4>
          <form onSubmit={async (e) => {
            e.preventDefault();
            }}>
            <div className="mb-3">
              <label className="form-label">Số sao:</label>
              <select 
                className="form-select"
                value={danhGiaMoi.diemXepHang}
                onChange={(e) => setDanhGiaMoi({...danhGiaMoi, diemXepHang: Number(e.target.value)})}
              >
                <option value="5">5 sao</option>
                <option value="4">4 sao</option>
                <option value="3">3 sao</option>
                <option value="2">2 sao</option>
                <option value="1">1 sao</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Nhận xét:</label>
              <textarea 
                className="form-control"
                rows={3}
                value={danhGiaMoi.nhanXet}
                onChange={(e) => setDanhGiaMoi({...danhGiaMoi, nhanXet: e.target.value})}
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              onClick={async ()=>{
                danhGiaMoi.maSach = maSach;
                await fetch("http://localhost:8080/api/danh-gia/them-danh-gia-v1", {
                  method: "POST",
                  headers: {
                      "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
                      'Content-Type': 'application/json' 
                  },
                  body: JSON.stringify(danhGiaMoi),
              })
                  .then( (response) => {
                      if(response.status=== 401){
                     
                        return null;
                      }
                      return response.json();
                  })
                  .then((response) => {
                    if(!response){
                      alert("Đăng nhập để đánh giá");
                    }
                    getAllReviewOfOneBook(maSach)
                      .then((danhGia) => {
                        setDanhSachDanhGia(danhGia);
                        setDangTaiDuLieu(false);
                      })
                      .catch((error) => {
                        setDangTaiDuLieu(false);
                        setBaoLoi(error.message);
                      });
                  })
                  .catch((error) => {
                      console.error("Lỗi:", error);
                      
                  });  
              }}
              disabled={dangGuiDanhGia}
            >
              {dangGuiDanhGia ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang gửi...
                </>
              ) : (
                <>Gửi đánh giá</>
              )}
            </button>
          </form>
        </div>
      </div>

      <h3 className="mb-4">
        <i className="fas fa-comments me-2"></i>
        Đánh giá từ khách hàng
      </h3><div className="00000000000000000000000000"></div>
      <div className="review-list">
        {danhSachDanhGia.map((danhGia) => (
          <div key={danhGia.maDanhGia} className="review-item card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <i className="fas fa-user-circle me-2 text-primary"></i>
                  <span className="fw-bold">Khách hàng</span>
                </div>
                <small className="text-muted">
                  {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </small>
              </div>
              <div className="mb-2">
                {renderStars(danhGia.diemXepHang)}
                <span className="ms-2 text-muted">
                  ({danhGia.diemXepHang}/5)
                </span>
              </div>
              <p className="review-content mb-0">
                {danhGia.nhanXet}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DanhGiaSanPham;
