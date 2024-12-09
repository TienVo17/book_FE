import React, { useEffect, useState } from "react";
import SachModel from "../../../models/SachModel";
import HinhAnhModel from "../../../models/HinhAnhModel";
import { getAllImageOfOneBook } from "../../../api/HinhAnhApi";
import { Link } from "react-router-dom";
import { renderStars } from "./DanhGiaSanPham";
import dinhDangSo from "../../utils/DinhDangSo";
import { toast } from 'react-toastify';
import { themVaoGioHang } from '../../utils/GioHangUtils';



interface SachPropsInterface {
  sach: SachModel;
}

const SachProps: React.FC<SachPropsInterface> = (props) => {
  const maSach: number = props.sach.maSach;

  const [danhSachAnh, setDanhSachAnh] = useState<HinhAnhModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState(null);

  useEffect(
    () => {
      getAllImageOfOneBook(maSach)
        .then((hinhAnhData) => {
          setDanhSachAnh(hinhAnhData);
          setDangTaiDuLieu(false);
        })
        .catch((error) => {
          setDangTaiDuLieu(false);
          setBaoLoi(error.message);
        });
    },
    [] // Chi goi mot lan
  );

  if (dangTaiDuLieu) {
    return (
      <div>
        <h1>Đang tải dữ liệu</h1>
      </div>
    );
  }

  if (baoLoi) {
    return (
      <div>
        <h1>Gặp lỗi: {baoLoi}</h1>
      </div>
    );
  }

  let duLieuAnh: string = "";
  if (danhSachAnh[0] && danhSachAnh[0].urlHinh) {
    duLieuAnh = danhSachAnh[0]?.urlHinh;
  }

  return (
    <div className="col-md-3 mt-2">
      <div className="card">
        <Link to={`/sach/${props.sach.maSach}`}>
          <img
            src={duLieuAnh}
            className="card-img-top"
            alt={props.sach.tenSach}
            style={{ height: "300px", objectFit: "cover" }}
          />
        </Link>
        <div className="card-body">
          <Link
            to={`/sach/${props.sach.maSach}`}
            style={{ textDecoration: "none" }}
          >
            <h5 className="card-title">{props.sach.tenSach}</h5>
          </Link>
          <div className="price row">
            <span className="original-price col-6 text-end">
              <del>{dinhDangSo(props.sach.giaNiemYet)}</del>
            </span>
            <span className="discounted-price col-6 text-end">
              <strong>{dinhDangSo(props.sach.giaBan)} đ</strong>
            </span>
          </div>
          <div className="row mt-2" role="group">
            <div className="col-6">
              {renderStars(
                props.sach.trungBinhXepHang ? props.sach.trungBinhXepHang : 0
              )}
            </div>
            <div className="col-6 text-end">
              <a href="#" className="btn btn-secondary btn-block me-2">
                <i className="fas fa-heart"></i>
              </a>
              <button 
                className="btn btn-danger btn-block"
                onClick={() => themVaoGioHang(props.sach)}
              >
                <i className="fas fa-shopping-cart"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SachProps;
