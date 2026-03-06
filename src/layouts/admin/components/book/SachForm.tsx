import React, { FormEvent, useCallback, useState } from 'react';
import UploadFile, { UploadFileValue } from '../UploadFile';
import { useNavigate } from 'react-router-dom';
import { createSachAdmin, uploadHinhAnhSach } from '../../../../api/AdminApi';
import SachModel from '../../../../models/SachModel';

const emptySach: SachModel = {
  maSach: 0,
  tenSach: '',
  giaBan: 0,
  giaNiemYet: 0,
  moTa: '',
  soLuong: 0,
  tenTacGia: '',
  isbn: '',
  trungBinhXepHang: 0,
  listImageStr: [],
};

const SachForm: React.FC = () => {
  const [sach, setSach] = useState<SachModel>(emptySach);
  const [uploadValue, setUploadValue] = useState<UploadFileValue>({ existingUrls: [], newFiles: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleUploadChange = useCallback((value: UploadFileValue) => {
    setUploadValue(value);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const createdSach = await createSachAdmin({ ...sach, listImageStr: [] });
      if (uploadValue.newFiles.length > 0) {
        try {
          await uploadHinhAnhSach(createdSach.maSach, uploadValue.newFiles);
        } catch (uploadError) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload hinh anh that bai';
          alert(`Da tao sach thanh cong, nhung upload anh that bai. Ban co the cap nhat lai tai trang sua sach.\n${errorMessage}`);
          navigate(`/quan-ly/cap-nhat-sach/${createdSach.maSach}`);
          return;
        }
      }

      alert('Da them sach thanh cong!');
      setSach(emptySach);
      setUploadValue({ existingUrls: [], newFiles: [] });
      navigate('/quan-ly/danh-sach-sach');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gap loi trong qua trinh them sach';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Quan ly sach</h1>
      <ol className="breadcrumb mb-4">
        <li className="breadcrumb-item"><a href="/quan-ly">Sach</a></li>
        <li className="breadcrumb-item active">Them sach moi</li>
      </ol>
      <div className="card mb-4">
        <div className="card-header">
          <i className="fas fa-book me-1"></i>
          Them sach moi
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="tenSach" className="form-label">Ten sach</label>
                  <input
                    className="form-control"
                    type="text"
                    value={sach.tenSach}
                    onChange={(e) => setSach({ ...sach, tenSach: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="giaBan" className="form-label">Gia ban</label>
                  <input
                    className="form-control"
                    type="number"
                    value={sach.giaBan}
                    onChange={(e) => setSach({ ...sach, giaBan: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="giaNiemYet" className="form-label">Gia niem yet</label>
                  <input
                    className="form-control"
                    type="number"
                    value={sach.giaNiemYet}
                    onChange={(e) => setSach({ ...sach, giaNiemYet: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="soLuong" className="form-label">So luong</label>
                  <input
                    className="form-control"
                    type="number"
                    value={sach.soLuong}
                    onChange={(e) => setSach({ ...sach, soLuong: parseInt(e.target.value, 10) || 0 })}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="tenTacGia" className="form-label">Ten tac gia</label>
                  <input
                    className="form-control"
                    type="text"
                    value={sach.tenTacGia}
                    onChange={(e) => setSach({ ...sach, tenTacGia: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="isbn" className="form-label">ISBN</label>
                  <input
                    className="form-control"
                    type="text"
                    value={sach.isbn}
                    onChange={(e) => setSach({ ...sach, isbn: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="uploadAnh" className="form-label">Upload anh</label>
                  <UploadFile onChange={handleUploadChange} />
                </div>
              </div>
              <div className="col-md-12">
                <label htmlFor="moTa" className="form-label">Mo ta</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={sach.moTa}
                  onChange={(e) => setSach({ ...sach, moTa: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="text-center mt-3">
              <button type="submit" className="btn btn-primary me-2" disabled={isSubmitting}>
                <i className="fas fa-save me-2"></i>
                {isSubmitting ? 'Dang luu...' : 'Luu sach'}
              </button>
              <button type="reset" className="btn btn-secondary" disabled={isSubmitting} onClick={() => {
                setSach(emptySach);
                setUploadValue({ existingUrls: [], newFiles: [] });
              }}>
                <i className="fas fa-undo me-2"></i>
                Lam moi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SachForm;
