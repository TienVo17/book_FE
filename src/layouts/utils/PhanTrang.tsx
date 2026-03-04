import React from "react";

interface PhanTrangInterface {
  trangHienTai: number;
  tongSoTrang: number;
  phanTrang: (trang: number) => void;
}

export const PhanTrang: React.FC<PhanTrangInterface> = (props) => {
  const danhSachTrang: number[] = [];

  if (props.trangHienTai === 1) {
    danhSachTrang.push(props.trangHienTai);
    if (props.tongSoTrang >= props.trangHienTai + 1) {
      danhSachTrang.push(props.trangHienTai + 1);
    }
    if (props.tongSoTrang >= props.trangHienTai + 2) {
      danhSachTrang.push(props.trangHienTai + 2);
    }
  } else if (props.trangHienTai > 1) {
    if (props.trangHienTai >= 3) {
      danhSachTrang.push(props.trangHienTai - 2);
    }
    if (props.trangHienTai >= 2) {
      danhSachTrang.push(props.trangHienTai - 1);
    }
    danhSachTrang.push(props.trangHienTai);
    if (props.tongSoTrang >= props.trangHienTai + 1) {
      danhSachTrang.push(props.trangHienTai + 1);
    }
    if (props.tongSoTrang >= props.trangHienTai + 2) {
      danhSachTrang.push(props.trangHienTai + 2);
    }
  }

  return (
    <nav aria-label="Phân trang">
      <div className="pagination-modern">
        <button
          className="page-btn"
          onClick={() => props.phanTrang(1)}
          disabled={props.trangHienTai === 1}
          aria-label="Trang đầu"
        >
          <i className="fas fa-angle-double-left"></i>
        </button>
        {danhSachTrang.map((trang) => (
          <button
            className={`page-btn ${props.trangHienTai === trang ? "active" : ""}`}
            key={trang}
            onClick={() => props.phanTrang(trang)}
          >
            {trang}
          </button>
        ))}
        <button
          className="page-btn"
          onClick={() => props.phanTrang(props.tongSoTrang)}
          disabled={props.trangHienTai === props.tongSoTrang}
          aria-label="Trang cuối"
        >
          <i className="fas fa-angle-double-right"></i>
        </button>
      </div>
    </nav>
  );
};
