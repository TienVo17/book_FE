import React, { useEffect, useMemo, useRef, useState } from "react";

interface ChonAnhDanhGiaProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

const SO_ANH_TOI_DA = 5;
const KICH_THUOC_TOI_DA = 5 * 1024 * 1024;
const DINH_DANG_CHO_PHEP = ["image/jpeg", "image/png", "image/webp"];

/** Chon va xem truoc anh; validate som de khong bat nguoi dung doi upload moi biet loi. */
const ChonAnhDanhGia: React.FC<ChonAnhDanhGiaProps> = ({ files, onChange, disabled }) => {
  const [loi, setLoi] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  );

  useEffect(
    () => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [previews]
  );

  const chonFiles = (danhSach: FileList | null) => {
    if (!danhSach) return;
    const moi = Array.from(danhSach);
    if (files.length + moi.length > SO_ANH_TOI_DA) {
      setLoi("Mỗi đánh giá tối đa 5 ảnh.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const quaNang = moi.find((file) => file.size > KICH_THUOC_TOI_DA);
    if (quaNang) {
      setLoi(`Ảnh ${quaNang.name} vượt quá 5MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const saiLoai = moi.find((file) => !DINH_DANG_CHO_PHEP.includes(file.type));
    if (saiLoai) {
      setLoi("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setLoi(null);
    onChange([...files, ...moi]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const boAnh = (index: number) => {
    setLoi(null);
    onChange(files.filter((_, viTri) => viTri !== index));
  };

  return (
    <fieldset className="review-image-picker" disabled={disabled}>
      <legend className="form-label">Ảnh đính kèm (không bắt buộc)</legend>
      <label className="visually-hidden" htmlFor="anh-danh-gia">Chọn ảnh đánh giá</label>
      <input
        ref={inputRef}
        id="anh-danh-gia"
        name="anh-danh-gia"
        className="form-control"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled || files.length >= SO_ANH_TOI_DA}
        onChange={(event) => chonFiles(event.target.files)}
        aria-describedby="anh-danh-gia-goi-y anh-danh-gia-so-luong anh-danh-gia-loi"
      />
      <small id="anh-danh-gia-goi-y" className="text-muted d-block mt-1">
        Tối đa 5 ảnh, mỗi ảnh 5MB. JPEG, PNG hoặc WebP.
      </small>
      <small id="anh-danh-gia-so-luong" className="text-muted d-block">
        Đã chọn {files.length}/5 ảnh.
      </small>
      {loi && <div id="anh-danh-gia-loi" className="text-danger mt-1" role="alert">{loi}</div>}
      {previews.length > 0 && (
        <ul className="review-image-preview-list" aria-label="Ảnh đã chọn">
          {previews.map(({ file, url }, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`}>
              <img src={url} alt={`Xem trước ${file.name}`} />
              <button type="button" onClick={() => boAnh(index)} disabled={disabled}>
                Gỡ {file.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
};

export default ChonAnhDanhGia;
