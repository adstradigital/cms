import { AuthProvider } from '@/context/AuthContext';
import { SchoolProvider } from '@/context/SchoolContext';
import { ThemeProvider } from '@/context/ThemeContext';
import '@/styles/global.css';

export const metadata = {
  title: 'Campus Management System',
  description: 'Production-ready school management solution',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <SchoolProvider>
              {children}
            </SchoolProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
