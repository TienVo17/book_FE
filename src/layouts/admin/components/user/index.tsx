import React, { useState, useEffect } from 'react';
import SachModel from '../../../../models/SachModel';
import { getAllBook, xoaSach } from '../../../../api/SachApi';
import { Link, useNavigate } from 'react-router-dom';
import { PhanTrang } from '../../../utils/PhanTrang';
import NguoiDungModel from "../../../../models/NguoiDungModel";
import {findAll} from "../../../../api/UserApi";
import { de } from 'date-fns/locale';

export default function UserComponent() {
  const [userList, setUserList] = useState<NguoiDungModel[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [baoLoi, setBaoLoi] = useState<string | null>(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<number>();
  const [nguoiDung, setNguoiDung] = useState<string>();
  const [quyenList, setQuyenList] = useState<any[]>([]);
  const [selectedQuyen, setSelectedQuyen] = useState<any[]>([]);
  const navigate = useNavigate();


  useEffect(() => {
    findAll(trangHienTai - 1)
        .then((kq) => {
          setUserList(kq.ketQua);
          setTongSoTrang(kq.tongSoTrang);
          setDangTaiDuLieu(false);
        })
        .catch((error) => {
          setBaoLoi(error.message);
          setDangTaiDuLieu(false);
        });
        
        fetch("http://localhost:8080/api/admin/quyen/findAll", {
          method: "GET",
          headers: {
              "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
              'Content-Type': 'application/json' 
          },})
          .then( (response) => {
              return response.json();
          })
          .then((response) => {
            setQuyenList(response)
          })
          .catch((error) => {
              console.error("Lỗi:", error);
              
          });  
    
  }, [trangHienTai]);

  const phanTrang = (trang: number) => setTrangHienTai(trang);



  const handleAdd = () => {
    try {
      navigate(`/quan-ly/them-sach`);
    } catch (error) {
      setBaoLoi('Có lỗi khi chuyển đến trang cập nhật');
    }
  };

  const handleClose = ()=>{
    setShowModal(false);
    setSelectedQuyen([])
  }

 const handleCheckboxChange = (maQuyen:any) => {

    if (selectedQuyen.includes(maQuyen)) {
      // Nếu đã chọn, thì bỏ chọn (xóa khỏi danh sách)
      setSelectedQuyen(selectedQuyen.filter((id) => id !== maQuyen));
    } else {
      // Nếu chưa chọn, thì thêm vào danh sách
      setSelectedQuyen([...selectedQuyen, maQuyen]);
  
    }
    
  };
  if (dangTaiDuLieu) {
    return <div>Đang tải dữ liệu...</div>;
  }

  if (baoLoi) {
    return <div>Có lỗi xảy ra: {baoLoi}</div>;
  }

  return (
    <div className="container-fluid px-4">
      <h1 className="mt-4">Quản lý user</h1>
      <ol className="breadcrumb mb-4">
        <li className="breadcrumb-item"><Link to="/danh-sach-nguoi-dung">User</Link></li>
        <li className="breadcrumb-item active">Danh sách user</li>
      </ol>
      <div className="card mb-4">
        <div className="card-header">
          <i className="fas fa-table me-1"></i>
          Danh sách user
        </div>
        <div className="card-body">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Mã người dùng</th>
                <th>Họ đệm</th>
                <th>Tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => (
                <tr key={user.maNguoiDung}>
                  <td>{user.maNguoiDung}</td>
                  <td>{user.hoDem} </td>
                  <td>{user.ten}</td>
                  <td>{user.email}</td>
                  <td>{user.soDienThoai}</td>
                  <td>
                    <button 
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => {
                        setShowModal(true);
                        setUserId(user.maNguoiDung);
                        setNguoiDung(user.hoDem +" "+user.ten)
                      }}
                    >
                      Phân quyền
                    </button>
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
      {/* Modal */}
      {showModal && (
        <div className="modal" style={{ display: 'block' }} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Phân quyền cho {nguoiDung}</h5>
              </div>
              <div className="modal-body">
                <ul>
                  {quyenList.map((item) => (
                    <li key={item?.maQuyen}>
                      <label>
                        <input
                          type="checkbox"
                          value={item.maQuyen}
                          checked={selectedQuyen.includes(item.maQuyen)}
                          onChange={() => handleCheckboxChange(item.maQuyen)}
                        />
                        {item.tenQuyen}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={()=>{
                    const body = {
                        userId: userId,
                        quyenIds:selectedQuyen
                    };
                    fetch("http://localhost:8080/api/admin/user/phan-quyen", {
                      method: "POST",
                      body: JSON.stringify(body),
                      headers: {
                          "Authorization": `Bearer ${localStorage.getItem('jwt')}`,
                          'Content-Type': 'application/json' 
                      },})
                      .then( (response) => {
                        if(response.status === 200){
                          alert("Thêm quyền thành công");
                          setShowModal(false);
                        }
                      })
                      
                      .catch((error) => {
                          console.error("Lỗi:", error);
                          
                      }); 
                }}>
                  Lưu
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                >
                 Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export {}; 