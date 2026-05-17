export const dynamic = 'force-dynamic'
export const revalidate = 0
import './globals.css'
export const metadata = { title: 'ImmoPixels CRM', description: 'ImmoPixels Board & CRM' }
export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
