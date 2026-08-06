import React from "react";

interface ChonSaoProps {
  giaTri: number;
  onChon: (sao: number) => void;
  disabled?: boolean;
}

const MO_TA: Record<number, string> = {
  1: "1 sao — Rất tệ",
  2: "2 sao — Tệ",
  3: "3 sao — Bình thường",
  4: "4 sao — Tốt",
  5: "5 sao — Rất tốt",
};

/**
 * Chọn số sao bằng một nhóm radio thật, không phải `<select>` cũng không phải `<div>`
 * bắt sự kiện click.
 *
 * Radio thật cho sẵn điều hướng bằng phím mũi tên, trạng thái đã chọn mà trình đọc màn
 * hình đọc được, và vùng bấm đủ lớn — ba thứ phải tự viết lại (thường là viết sai) nếu
 * dựng bằng `div`. Ngôi sao chỉ là lớp trang trí phủ lên trên.
 */
const ChonSao: React.FC<ChonSaoProps> = ({ giaTri, onChon, disabled }) => (
  <fieldset className="border-0 p-0 m-0">
    <legend className="form-label fs-6">Số sao</legend>
    <div className="d-flex gap-1" role="radiogroup" aria-label="Số sao">
      {[1, 2, 3, 4, 5].map((sao) => (
        <label
          key={sao}
          className="d-inline-flex align-items-center justify-content-center"
          style={{
            minWidth: "2.5rem",
            minHeight: "2.5rem",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
          title={MO_TA[sao]}
        >
          <input
            type="radio"
            name="diem-xep-hang"
            className="visually-hidden"
            value={sao}
            checked={giaTri === sao}
            disabled={disabled}
            onChange={() => onChon(sao)}
          />
          <span aria-hidden="true" style={{ fontSize: "1.5rem", lineHeight: 1 }}>
            <i className={sao <= giaTri ? "fas fa-star" : "far fa-star"} />
          </span>
          <span className="visually-hidden">{MO_TA[sao]}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

export default ChonSao;
