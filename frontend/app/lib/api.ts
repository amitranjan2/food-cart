export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:8080';
export type MenuItem={id:string;name:string;description?:string;imageUrl?:string;categoryId?:string;foodType?:'VEG'|'NON_VEG'|'EGG'|'OTHER';price:number;halfPrice?:number;available:boolean;halfAvailable?:boolean;active:boolean;sortOrder?:number};
export type MenuCategory={id:string;vendorId?:string;name:string;sortOrder?:number};
export type PublicMenu={categories:MenuCategory[];items:MenuItem[]};
export type Vendor={id:string;name:string;slug:string;description?:string;address?:string;coverImageUrl?:string;logoUrl?:string;themeColor?:string;status:'OPEN'|'CLOSED'};
export async function request<T>(path:string,options:RequestInit={},token?:string):Promise<T>{const headers:Record<string,string>={...(token?{Authorization:`Bearer ${token}`}:{}) ,...(options.headers as Record<string,string>||{})};if(!(options.body instanceof FormData)&&!headers['Content-Type'])headers['Content-Type']='application/json';const r=await fetch(API+path,{...options,headers});if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error||'Something went wrong');}return r.json();}
