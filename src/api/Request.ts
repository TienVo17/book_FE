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

// Authenticated fetch wrapper - tự động gắn JWT token
export async function authRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }
  // Handle empty responses (204 No Content)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
