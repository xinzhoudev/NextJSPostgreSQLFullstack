// Next.js processes this stylesheet import; TypeScript has no declaration for CSS files.
import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';

export default function RootLayout({children,}: {children: React.ReactNode;}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
