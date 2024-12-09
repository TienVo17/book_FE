import React, { useState, useEffect } from 'react';
import SachModel from '../../../../models/SachModel';
import { Link, useNavigate } from 'react-router-dom';
import { PhanTrang } from '../../../utils/PhanTrang';
import {getAllBook, xoaSach,findAll} from "../../../../api/SachApi";

export default function DanhSachBinhLuan() {
  const [binhLuanList, setBinhLuanList] = useState<any[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [showModal, setShowModal] = useState(0);
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();

  const [jwt, setJwt] = useState(localStorage.getItem('jwt') || '');

  useEffect(() => {
    if (jwt) {
      const decodedJwt = JSON.parse(atob(jwt.split('.')[1]));
      setUserInfo(decodedJwt);
    }
     findAll();
  }, [trangHienTai]);

  const findAll= ()=>{
    fetch("http://localhost:8080/api/admin/danh-gia/findAll?page="+(trangHienTai-1), {
      method: "GET",
      headers: {
          "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json' 
      },
     
      })
      .then( (response) => {
          return response.json();
      })
      .then((response) => {
        setBinhLuanList(response.content);
        setTongSoTrang(response.totalElements);
        setDangTaiDuLieu(false)
      })
      .catch((error) => {
          console.error("Lỗi:", error);
          
      });  
  }

  const phanTrang = (trang: number) => setTrangHienTai(trang);

  const handleEdit = (maSach: number) => {
    try {
      navigate(`/quan-ly/cap-nhat-sach/${maSach}`);
    } catch (error) {
      setBaoLoi('Có lỗi khi chuyển đến trang cập nhật');
    }
  };

  const handleAdd = () => {
    try {
      navigate(`/quan-ly/them-sach`);
    } catch (error) {
      setBaoLoi('Có lỗi khi chuyển đến trang cập nhật');
    }
  };

  const handleDelete = async (maSach: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cuốn sách này?')) {
      try {
        await xoaSach(maSach);
        alert('Xóa sách thành công!');
        

 
       

      } catch (error) {
        alert('Có lỗi xảy ra khi xóa sách!');
        console.error('Lỗi xóa sách:', error);
      }
    }
  };

  const handleClose = ()=>{

  }

  if (dangTaiDuLieu) {
    return <div>Đang tải dữ liệu...</div>;
  }

  if (baoLoi) {
    return <div>Có lỗi xảy ra: {baoLoi}</div>;
  }

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Quản lý bình luận</h1>
      <ol className="breadcrumb mb-4">
        <li className="breadcrumb-item"><Link to="/quan-ly">Dashboard</Link></li>
        <li className="breadcrumb-item active">Danh sách bình luận</li>
      </ol>
      <div className="mb-4">
        <button
            className="btn btn-primary btn-sm me-2"
            onClick={() => handleAdd()}
        >
          Thêm mới <i className="fas fa-add"></i>
        </button>
        
      </div>
      <div className="card mb-4">
        <div className="card-header">
          <i className="fas fa-table me-1"></i>
          Danh sách bình luận
        </div>
        <div className="card-body">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Mã bình luận</th>
                <th>Nhận xét</th>
                <th>Điểm xếp hạng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {binhLuanList.map((sach) => (
                <tr key={sach.maDanhGia}>
                  <td>{sach.maDanhGia}</td>
                  <td>{sach.nhanXet}</td>
                  <td>{sach.diemXepHang}</td>
                  <td>
                  {sach.isActive ?
                        <button
                            className="btn btn-warning btn-sm me-2"
                            onClick={() => {
                              if (window.confirm('Bạn có đóng bán sách này?')) {
                                try {
                                   fetch("http://localhost:8080/api/admin/danh-gia/unactive/"+sach.maDanhGia, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
                                        'Content-Type': 'application/json' 
                                    },
                                })
                                    .then( (response) => {
                                      findAll();
                             
                                    })
                                    .catch((error) => {
                                      
                                        
                                    }); 
                                } catch (error) {
                                  alert('Có lỗi xảy ra khi xóa sách!');
                                  console.error('Lỗi xóa sách:', error);
                                }
                              }
                            }}
                        >
                          <i className="fas fa-lock"></i>
                        </button>
                        :
                        <button
                            className="btn btn-success btn-sm me-2"
                            onClick={() => {
                              if (window.confirm('Bạn có muốn mở sách này?')) {
                                try {
                                    fetch("http://localhost:8080/api/admin/danh-gia/active/"+sach.maDanhGia, {
                                      method: "POST",
                                      headers: {
                                          "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
                                          'Content-Type': 'application/json' 
                                      },
                                    })
                                    .then( (response) => {
                                      findAll();
                                    })
                                    .catch((error) => {
                                        console.error("Lỗi:", error);
                                        
                                    });
                                } catch (error) {
                                  alert('Có lỗi xảy ra khi xóa sách!');
                                  console.error('Lỗi xóa sách:', error);
                                }
                              }
                            }}
                        >
                          <i className="fas fa-lock"></i>
                        </button>
                        
                        }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PhanTrang 
        trangHienTai={trangHienTai}
        tongSoTrang={tongSoTrang}
        phanTrang={phanTrang}
      />

      
    </div>
  );
}

export {}; 