import './globals.css';
import type { Metadata, Viewport } from 'next';
export const metadata: Metadata = { title:'Supr-Mama', description:'Order from your neighbourhood food stalls', manifest:'/manifest.webmanifest' };
export const viewport: Viewport = { themeColor:'#d5ff3f' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
