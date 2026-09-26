export function FooterBrushWord({word}:{word:string}){
 const [x,width]=word==='THE'?[0,515]:word==='NEXT'?[515,710]:[1225,927];
 return <svg className="footer-brush-word" viewBox={`${x} 390 ${width} 310`} aria-hidden="true" style={{width:`${width/310}em`}}><image href="/media/typography/footer-brush-sheet.png" width="2152" height="731"/></svg>;
}
