import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.airtelsync.customer',
  appName: 'Airtel Sync',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#f7f8fa' },
};
export default config;
