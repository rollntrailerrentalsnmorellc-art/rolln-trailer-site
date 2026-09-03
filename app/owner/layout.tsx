import type {Metadata,Viewport} from 'next';
import OwnerAppChrome from './OwnerAppChrome';

export const metadata:Metadata={
 title:"Owner App",
 description:"Private mobile operations app for Roll'N Trailer Rentals N More LLC.",
 manifest:'/owner.webmanifest',
 robots:{index:false,follow:false},
 appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:"Roll'N Owner"},
 icons:{apple:'/images/RTRlogo.png'},
};

export const viewport:Viewport={themeColor:'#070907',viewportFit:'cover'};

export default function OwnerLayout({children}:{children:React.ReactNode}){
 return <div className="owner-app"><OwnerAppChrome>{children}</OwnerAppChrome></div>;
}
