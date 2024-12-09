import {useEffect, useState} from "react";



// Định nghĩa kiểu cho props
interface UploadFileProps {
    onBase64Change: (base64: any) => void;  // Callback truyền base64 lên component cha
    existingBase64?: [];
}

const UploadFile: React.FC<UploadFileProps> = ({ onBase64Change,existingBase64 = [] }) => {
    // State để lưu trữ Base64

    useEffect(() => {
        console.log("ss",existingBase64)
    })
    const [base64, setBase64] = useState<any[]>(existingBase64);

    // Hàm xử lý khi người dùng chọn tệp
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        convertFilesToBase64(selectedFiles);
    };
    const convertFilesToBase64 = (files: any) => {
        const fileArray = Array.from(files); // Chuyển đổi FileList thành array
        const base64Array: (string | ArrayBuffer | null)[] = [];

        // Duyệt qua từng file và sử dụng FileReader để chuyển thành Base64
        fileArray.forEach(file => {
            const reader = new FileReader();

            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    // Tạo canvas để chuyển đổi ảnh thành WebP
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Vẽ ảnh lên canvas
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        // Chuyển đổi canvas thành WebP (chất lượng 80%)
                        const webpBase64 = canvas.toDataURL("image/webp", 0.8); // 0.8 là chất lượng (80%)

                        // Lưu base64 vào mảng
                        base64Array.push(webpBase64);

                        // Nếu đã chuyển đổi tất cả file, cập nhật state và gọi callback
                        if (base64Array.length === fileArray.length) {
                            setBase64(base64Array);
                            // @ts-ignore
                            onBase64Change(base64Array);
                        }
                    }
                };

                // Đọc ảnh từ FileReader
                img.src = reader.result as string;
            };

            // Đọc file dưới dạng Data URL (Base64)
            // @ts-ignore
            reader.readAsDataURL(file);
        });
    };

    const handleDelete = (index: number) => {

        const updatedBase64 = base64.filter((_:any, i:number) => i !== index); // Loại bỏ ảnh tại chỉ số 'index'
        console.log(updatedBase64);
        setBase64(updatedBase64); // Cập nhật state base64 mới
        onBase64Change(updatedBase64); // Cập nhật giá trị mới cho component cha
    };

    // @ts-ignore
    return (
        <div>
            <input type="file" multiple onChange={handleFileChange} />
            <div style={{ display: "flex", flexWrap: "wrap" }}>
                {base64.map((b64:any, index:any) => (
                    <div key={index} style={{ margin: "10px", position: "relative" }}>
                        <img
                            src={b64}
                            style={{ width: 100, height: 100, margin: 5 }}
                        />
                        <div
                            onClick={() => handleDelete(index)} // Gọi handleDelete khi nhấn nút xóa
                            style={{
                                position: "absolute",
                                top: "0",
                                right: "0",
                                backgroundColor: "#ff4d4d",
                                color: "#fff",
                                border: "none",
                                padding: "5px",
                                cursor: "pointer",
                                borderRadius: "50%",
                                fontSize: "12px",
                            }}
                        >
                            X
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UploadFile;