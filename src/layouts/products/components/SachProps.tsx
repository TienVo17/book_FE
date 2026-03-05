import React, { useEffect, useState } from "react";
import SachModel from "../../../models/SachModel";
import HinhAnhModel from "../../../models/HinhAnhModel";
import { getAllImageOfOneBook } from "../../../api/HinhAnhApi";
import { Link } from "react-router-dom";
import { renderStars } from "./DanhGiaSanPham";
import dinhDangSo from "../../utils/DinhDangSo";
import { themVaoGioHang } from "../../utils/GioHangUtils";
import { themYeuThich, xoaYeuThich } from "../../../api/YeuThichApi";
import { toast } from "react-toastify";

interface SachPropsInterface {
  sach: SachModel;
}

const SachProps: React.FC<SachPropsInterface> = (props) => {
  const maSach: number = props.sach.maSach;

  const [danhSachAnh, setDanhSachAnh] = useState<HinhAnhModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState(null);
  const [daYeuThich, setDaYeuThich] = useState(false);

  useEffect(() => {
    getAllImageOfOneBook(maSach)
      .then((hinhAnhData) => {
        setDanhSachAnh(hinhAnhData);
        setDangTaiDuLieu(false);
      })
      .catch((error) => {
        setDangTaiDuLieu(false);
        setBaoLoi(error.message);
      });
  }, []);

  const handleToggleYeuThich = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      toast.info("Vui lòng đăng nhập để sử dụng tính năng yêu thích!");
      return;
    }
    try {
      if (daYeuThich) {
        await xoaYeuThich(maSach);
        setDaYeuThich(false);
        toast.success("Đã xóa khỏi danh sách yêu thích!");
      } else {
        await themYeuThich(maSach);
        setDaYeuThich(true);
        toast.success("Đã thêm vào danh sách yêu thích!");
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  if (dangTaiDuLieu) {
    return (
      <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
        <div className="product-card">
          <div className="skeleton skeleton-img"></div>
          <div className="product-card-body">
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text-sm"></div>
            <div className="skeleton skeleton-text-sm" style={{ width: "40%" }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (baoLoi) {
    return null;
  }

  let duLieuAnh: string = "";
  if (danhSachAnh[0] && danhSachAnh[0].urlHinh) {
    duLieuAnh = danhSachAnh[0]?.urlHinh;
  }

  return (
    <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
      <div className="product-card">
        <Link to={`/sach/${props.sach.maSach}`}>
          <div className="product-card-img-wrapper">
            <img
              src={duLieuAnh}
              alt={props.sach.tenSach}
              loading="lazy"
            />
          </div>
        </Link>
        <div className="product-card-body">
          <div className="product-card-stars">
            {renderStars(props.sach.trungBinhXepHang ? props.sach.trungBinhXepHang : 0)}
          </div>
          <Link to={`/sach/${props.sach.maSach}`} style={{ textDecoration: "none" }}>
            <h5 className="product-card-title">{props.sach.tenSach}</h5>
          </Link>
          <div className="product-card-price">
            <span className="price-current">{dinhDangSo(props.sach.giaBan)} đ</span>
            {props.sach.giaNiemYet != null && props.sach.giaBan != null && props.sach.giaNiemYet > props.sach.giaBan && (
              <span className="price-original">{dinhDangSo(props.sach.giaNiemYet)}</span>
            )}
          </div>
          <div className="product-card-actions">
            <button
              className="btn-icon"
              aria-label="Yêu thích"
              onClick={handleToggleYeuThich}
            >
              <i className={`fas fa-heart ${daYeuThich ? 'text-danger' : ''}`}></i>
            </button>
            <button
              className="btn-icon btn-icon-cart"
              aria-label="Thêm vào giỏ hàng"
              onClick={() => themVaoGioHang(props.sach)}
            >
              <i className="fas fa-shopping-cart"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SachProps;
