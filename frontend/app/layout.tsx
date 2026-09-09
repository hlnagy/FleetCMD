import './globals.css';
import SweetAlertProvider from '../components/SweetAlertProvider';
import AppShell from '../components/AppShell';
import { AuthProvider } from '../lib/AuthContext';
import { ThemeProvider } from '../lib/ThemeContext';

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
    <html lang="ro" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('fleetcmd_theme');
                  var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolved = t;
                  if (t === 'system' || !t) resolved = d ? 'dark' : 'light';
                  
                  document.documentElement.classList.remove('dark', 'gray');
                  if (resolved === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else if (resolved === 'gray') {
                    document.documentElement.classList.add('gray');
                    document.documentElement.setAttribute('data-theme', 'gray');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }

                  var fs = localStorage.getItem('fleetcmd_font_size') || 'standard';
                  document.documentElement.setAttribute('data-font-size', fs);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-morning-100 text-sapphire-900 flex min-h-screen transition-colors duration-200">
        <SweetAlertProvider />
        <ThemeProvider>
          <AuthProvider>
            <AppShell>
              {children}
            </AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
