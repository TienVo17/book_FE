export async function my_request(duongDan: string) {
    // Truy vấn tới đường dẫn
    const response = await fetch(duongDan);
    // Nếu bị trả về lỗi
    if (!response.ok) {
      throw new Error(`Không thể truy cập ${duongDan}`);
    }
    // Nếu tra về OK
    return response.json();
  }