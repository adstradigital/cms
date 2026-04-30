import { AuthProvider } from '@/context/AuthContext';
import { SchoolProvider } from '@/context/SchoolContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ChatProvider } from '@/context/ChatContext';
import '@/styles/global.css';

export const metadata = {
  title: 'CMS',
  description: 'Production-ready school management solution',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
            <SchoolProvider>
              {children}
            </SchoolProvider>
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
