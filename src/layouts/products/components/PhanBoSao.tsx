import React from "react";

interface PhanBoSaoProps {
  /** Luôn đủ 5 khoá "1".."5"; khoá giá trị 0 vẫn phải có mặt để thanh không biến mất. */
  phanBo: Record<string, number>;
  tongSo: number;
  diemTrungBinh: number;
  /** Mức sao đang lọc, `null` là không lọc. */
  locSao: number | null;
  onChonSao: (sao: number | null) => void;
}

/**
 * Phân bố sao, bấm được để lọc.
 *
 * Phần trăm luôn tính trên `tongSo` toàn bộ đánh giá hiển thị, không tính trên số dòng
 * khớp bộ lọc đang chọn — nếu không, bấm vào "5 sao" sẽ làm bốn cột còn lại về 0 và
 * thanh phân bố tự phá huỷ chính công dụng của nó.
 */
const PhanBoSao: React.FC<PhanBoSaoProps> = ({
  phanBo,
  tongSo,
  diemTrungBinh,
  locSao,
  onChonSao,
}) => (
  <div className="rating-summary mb-3">
    <div className="d-flex align-items-center gap-3 mb-2">
      <span style={{ fontSize: "2rem", fontWeight: 700 }}>
        {diemTrungBinh.toFixed(1)}
      </span>
      <span className="text-muted">
        {tongSo} đánh giá
      </span>
    </div>

    {[5, 4, 3, 2, 1].map((sao) => {
      const soLuong = phanBo[String(sao)] ?? 0;
      const phanTram = tongSo === 0 ? 0 : (soLuong / tongSo) * 100;
      const dangChon = locSao === sao;
      return (
        <button
          key={sao}
          type="button"
          className="rating-bar-row d-flex align-items-center gap-2 w-100 border-0 bg-transparent p-1"
          aria-pressed={dangChon}
          aria-label={`Lọc ${sao} sao (${soLuong} đánh giá)`}
          onClick={() => onChonSao(dangChon ? null : sao)}
          style={{ cursor: "pointer", fontWeight: dangChon ? 700 : 400 }}
        >
          <span style={{ width: "3.5rem", textAlign: "left" }}>{sao} sao</span>
          <span
            className="flex-grow-1"
            style={{ background: "var(--color-border, #e5e5e5)", height: "0.5rem", borderRadius: "0.25rem" }}
          >
            <span
              style={{
                display: "block",
                width: `${phanTram}%`,
                height: "100%",
                background: "var(--color-primary, #f5a623)",
                borderRadius: "0.25rem",
              }}
            />
          </span>
          <span style={{ width: "2.5rem", textAlign: "right" }}>{soLuong}</span>
        </button>
      );
    })}

    {locSao !== null && (
      <button
        type="button"
        className="btn btn-link p-0 mt-1"
        onClick={() => onChonSao(null)}
      >
        Bỏ lọc
      </button>
    )}
  </div>
);

export default PhanBoSao;
