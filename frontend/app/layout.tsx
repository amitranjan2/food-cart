import './globals.css';
import type { Metadata, Viewport } from 'next';
export const metadata: Metadata = { title:'FoodCart', description:'Order from neighbourhood food carts', manifest:'/manifest.webmanifest' };
export const viewport: Viewport = { themeColor:'#d5ff3f' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
