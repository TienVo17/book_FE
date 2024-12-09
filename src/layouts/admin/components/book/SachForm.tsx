import React, {useState, FormEvent} from 'react';
import UploadFile from '../UploadFile';
import {useNavigate} from "react-router-dom";



const SachForm: React.FC = () => {
    const [sach, setSach] = useState({
        maSach: 0,
        tenSach: "",
        giaBan: 0,
        giaNiemYet: 0,
        moTa: "",
        soLuong: 0,
        tenTacGia: "",
        isbn: "",
        trungBinhXepHang: 0,
        listImageStr:[]
    });
    const navigate = useNavigate();

    const [fileBase64, setFileBase64] = useState([]);

    // @ts-ignore
    const handleBase64Change = (base64) => {
        setFileBase64(base64);  // Lưu base64 vào state của component cha
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const token = localStorage.getItem("jwt");
        console.log("Token:", token);

        // if (!token) {
        //     alert("Bạn chưa đăng nhập!");
        //     return;
        // }

        console.log("Dữ liệu sách gửi đi:", sach);
        sach.listImageStr = fileBase64;
        fetch("http://localhost:8080/api/admin/sach/insert", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(sach),
        })
            .then(async (response) => {
                console.log("Status:", response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.log("Error response:", errorText);
                    throw new Error(errorText);
                }

                return response;
            })
            .then((response) => {
                alert("Đã thêm sách thành công!");
                navigate('/quan-ly/danh-sach-sach');
                setSach({
                    maSach: 0,
                    tenSach: "",
                    giaBan: 0,
                    giaNiemYet: 0,
                    moTa: "",
                    soLuong: 0,
                    tenTacGia: "",
                    isbn: "",
                    trungBinhXepHang: 0,
                    listImageStr: []
                });
            })
            .catch((error) => {
                console.error("Lỗi:", error);
                alert("Gặp lỗi trong quá trình thêm sách!");
            });
    };

    // @ts-ignore
    return (
        <div className="container-fluid px-4">
            <h1 className="mt-4">Quản lý sách</h1>
            <ol className="breadcrumb mb-4">
                <li className="breadcrumb-item"><a href="/quan-ly">Dashboard</a></li>
                <li className="breadcrumb-item active">Thêm sách mới</li>
            </ol>
            <div className="card mb-4">
                <div className="card-header">
                    <i className="fas fa-book me-1"></i>
                    Thêm sách mới
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="tenSach" className="form-label">Tên sách</label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        value={sach.tenSach}
                                        onChange={(e) => setSach({...sach, tenSach: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="giaBan" className="form-label">Giá bán</label>
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={sach.giaBan}
                                        onChange={(e) => setSach({...sach, giaBan: parseFloat(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="giaNiemYet" className="form-label">Giá niêm yết</label>
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={sach.giaNiemYet}
                                        onChange={(e) => setSach({...sach, giaNiemYet: parseFloat(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="soLuong" className="form-label">Số lượng</label>
                                    <input
                                        className="form-control"
                                        type="number"
                                        value={sach.soLuong}
                                        onChange={(e) => setSach({...sach, soLuong: parseInt(e.target.value)})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="tenTacGia" className="form-label">Tên tác giả</label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        value={sach.tenTacGia}
                                        onChange={(e) => setSach({...sach, tenTacGia: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="isbn" className="form-label">ISBN</label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        value={sach.isbn}
                                        onChange={(e) => setSach({...sach, isbn: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="isbn" className="form-label">Upload ảnh</label>
                                    <UploadFile onBase64Change={handleBase64Change}></UploadFile>
                                </div>
                            </div>
                            <div className="col-md-12">
                                    <label htmlFor="moTa" className="form-label">Mô tả</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        value={sach.moTa}
                                        onChange={(e) => setSach({...sach, moTa: e.target.value})}
                                        required
                                    />
                            </div>
                        </div>
                        <div className="text-center mt-3">
                            <button type="submit" className="btn btn-primary me-2">
                                <i className="fas fa-save me-2"></i>
                                Lưu sách
                            </button>
                            <button type="reset" className="btn btn-secondary">
                                <i className="fas fa-undo me-2"></i>
                                Lưu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SachForm;
