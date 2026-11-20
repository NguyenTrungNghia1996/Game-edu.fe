import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'vn.yourdomain.rungchucai',
  appName: 'Rừng Chữ Cái',
  webDir: '.output/public',
  server: {
    androidScheme: 'https', // Bắt buộc dùng https để gọi API không bị lỗi Mixed Content
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
    },
  },
}

export default config
