'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';

interface ClerkThemeProviderProps {
  children: React.ReactNode;
}

export default function ClerkThemeProvider({
  children,
}: ClerkThemeProviderProps) {
  const { theme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: theme === 'dark' ? '#10b981' : '#059669', // emerald-500/600
          colorPrimaryForeground: '#ffffff',
          colorBackground: theme === 'dark' ? '#0f172a' : '#ffffff',
          colorForeground: theme === 'dark' ? '#f8fafc' : '#111827',
          colorMutedForeground: theme === 'dark' ? '#d1d5db' : '#6b7280',
          colorInput: theme === 'dark' ? '#111827' : '#f9fafb',
          colorInputForeground: theme === 'dark' ? '#f8fafc' : '#1f2937',
          colorNeutral: theme === 'dark' ? '#374151' : '#d1d5db',
          colorBorder: theme === 'dark' ? '#334155' : '#e5e7eb',
          borderRadius: '0.75rem',
        },
        elements: {
          formButtonPrimary: {
            backgroundColor: theme === 'dark' ? '#10b981' : '#059669',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#059669' : '#047857',
            },
          },
          card: {
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(16px)',
            border:
              theme === 'dark'
                ? '1px solid rgba(75, 85, 99, 0.3)'
                : '1px solid rgba(229, 231, 235, 0.3)',
          },
          headerTitle: {
            color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
          },
          headerSubtitle: {
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          },
          socialButtonsBlockButton: {
            border:
              theme === 'dark'
                ? '1px solid rgba(75, 85, 99, 0.5)'
                : '1px solid rgba(229, 231, 235, 0.3)',
            backgroundColor:
              theme === 'dark'
                ? 'rgba(30, 41, 59, 0.85)'
                : 'rgba(255, 255, 255, 0.5)',
            color: theme === 'dark' ? '#f8fafc' : '#111827',
            backdropFilter: 'blur(8px)',
          },
          dividerLine: {
            backgroundColor:
              theme === 'dark'
                ? 'rgba(75, 85, 99, 0.3)'
                : 'rgba(229, 231, 235, 0.3)',
          },
          formFieldInput: {
            backgroundColor:
              theme === 'dark'
                ? 'rgba(55, 65, 81, 0.5)'
                : 'rgba(249, 250, 251, 0.8)',
            backdropFilter: 'blur(8px)',
            border:
              theme === 'dark'
                ? '1px solid rgba(75, 85, 99, 0.3)'
                : '1px solid rgba(229, 231, 235, 0.3)',
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}