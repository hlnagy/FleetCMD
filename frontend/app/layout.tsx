import './globals.css';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import SweetAlertProvider from '../components/SweetAlertProvider';
import { SidebarProvider } from '../lib/SidebarContext';

export const metadata = {
  title: 'FleetCMD',
  description: 'FleetCMD - Sistem CMMS & FMS Enterprise pentru gestionarea flotei de camioane și utilaje grele',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body className="bg-morning-100 text-sapphire-900 flex min-h-screen">
        <SweetAlertProvider />
        <SidebarProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
