"use client";
import serviceGroups from "../../content/portfolio-groups.json";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { projects, siteContent, t } from "../content";
import { useLanguage } from "../language";
import { EditorialHeader } from "./EditorialHeader";
import { PriorityPreviewVideo } from "./PriorityPreviewVideo";
import { mediaUrl } from "../media-delivery";
import { MEDIA_PRIORITY } from "../hero-media";
import { ReferenceMotion } from "./ReferenceMotion";
import { CinemaPilot } from "./CinemaPilot";
import { CinemaInteractions, CinemaGuide } from "./CinemaInteractions";
import { PenNote, PenMark, PenMotion } from "./Handwritten";
import { BrushFooter } from "./BrushFooter";
import { FooterBrushWord } from "./FooterBrushWord";
import { CreativeChapters } from "./CreativeChapters";
import { getPortfolioGroup, getProjectsForPortfolioGroup } from "../portfolio-groups";

const services = serviceGroups.map(group => [group.title.zh, group.title.en, group.description.zh, group.description.en, group.id]);

export function ReferenceLayout({hero, children}: {hero: ReactNode; children: ReactNode}) {
  const {language} = useLanguage();
  const zh = language === "zh";
  const [activeService,setActiveService] = useState(0);
  const [portraitOpen,setPortraitOpen] = useState(false);
  const selected = useMemo(() => {
    const featured = projects.filter(p=>p.featured).sort((a,b)=>(a.featuredOrder ?? 999)-(b.featuredOrder ?? 999));
    const lead = [projects.find(p=>p.slug==="afterglow"), projects.find(p=>p.slug==="orbital-form")].filter((p): p is typeof projects[number]=>Boolean(p));
    return [...lead, ...[...featured,...projects.filter(p=>!p.featured)].filter(p=>!lead.some(l=>l.slug===p.slug))].slice(0,6);
  },[]);
  const serviceImages = useMemo(() => {
    const group = getPortfolioGroup("live-gifts");
    const gift = group ? getProjectsForPortfolioGroup(group)[0] : undefined;
    return [...selected.slice(0,4), gift ?? selected[0]];
  }, [selected]);
  return <main id="top" className="editorial-site reference-home">
    <ReferenceMotion />
    <CinemaPilot />
    <PenMotion />
    <CinemaInteractions />
    <CinemaGuide />
    {children}
    <EditorialHeader />
    <nav className="reference-nav" aria-label="Homepage sections">
      <a href="#selected-work">WORK</a><a href="#services">SERVICES</a><a href="#about">ABOUT</a><a href="#contact">CONTACT</a>
    </nav>
    <p className="reference-top-note">VISUAL STORIES<br/>FOR A BRIGHTER TOMORROW.</p>
    {hero}
    <section id="selected-work" className="reference-work" aria-label={zh?"精选作品":"Selected work"}>
      <div className="brush-section-note"><PenNote text="Selected cuts"/><span>01 — 06 / SELECTED WORK</span></div>
      <div className="reference-features">{selected.slice(0,2).map((p,i)=><article className={`reference-feature feature-${i+1}`} key={p.slug}>
        <aside className="reference-side"><span className="reference-number">0{i+1}{i===0&&<PenMark kind="circle" className="pen-number-circle"/>}</span><p>{i===0?<>GOOD<br/>IDEAS<br/>TRAVEL<br/>FURTHER.</>:<>MORE<br/>PEOPLE.<br/>A BRIGHTER<br/>TOMORROW.</>}</p>{i===0&&<div className="pen-work-note"><PenNote text="good ideas"/><PenMark kind="arrow"/></div>}</aside>
        <Link href={`/work/${p.slug}`} className="reference-project">
          <div className="reference-feature-media"><img src={p.poster} alt={t(p.title,language)} loading="lazy" decoding="async"/>
          {p.previewVideo && <PriorityPreviewVideo src={p.previewVideo} poster={p.poster} releaseNextPriority={i===0?MEDIA_PRIORITY.capabilities:undefined}/>}
          <span className="cinema-project-cursor" aria-hidden="true">VIEW<br/>FILM ↗</span>
          <span className="reference-view">VIEW PROJECT <ArrowRight size={20}/></span></div>
          <div className="reference-project-meta"><h2>{t(p.title,language)}</h2><span>{t(p.category,"en")}</span><span className="reference-medium">FILM / SOCIAL / VISUAL</span><span>{p.year}</span></div>
        </Link>
        <aside className="reference-side-note"><span>{i===0?<>A<br/>BOLDER<br/>TOMORROW.</>:<>TECHNOLOGY<br/>FOR A<br/>MORE HUMAN<br/>TOMORROW.</>}</span><b>/0{i+1}</b></aside>
      </article>)}</div>
      <div className="reference-small-grid" id="cinema-cards">{selected.slice(2).map(p=><Link className="reference-small-project" href={`/work/${p.slug}`} key={p.slug}>
        <img src={p.poster} alt={t(p.title,language)} loading="lazy" decoding="async"/>
        <div><h2>{t(p.title,language)}</h2><span>{t(p.category,"en")}</span></div>
        <p>VIEW PROJECT <ArrowRight size={18}/></p>
      </Link>)}</div>
      <Link className="reference-archive" href="/work">{zh?"查看全部作品":"ALL WORK"} <span>{projects.length} PROJECTS</span><ArrowRight size={19}/></Link>
    </section>
    <section id="services" className="reference-services">
      <div className="cinema-service-stage"><div className="cinema-service-images" aria-hidden="true">{serviceImages.map((p,i)=><img key={`${p.slug}-${i}`} className={activeService===i?"is-active":""} src={p.poster} alt="" loading="lazy"/>)}</div><p className="reference-eyebrow">SERVICES</p><h2>{zh?<>用影像与创意<br/>连接更大的世界。</>:<>Creative stories.<br/>A bigger world.</>}</h2><p className="reference-micro">CREATIVE SOLUTIONS<br/>FOR A BRIGHTER TOMORROW.</p><span className="cinema-service-caption">0{activeService+1} / {services[activeService][1]}</span></div>
      <div className="reference-service-list">{services.map(([cn,en,desc,descEn,group],i)=><details key={en} className={activeService===i?"cinema-service-active":""} onPointerEnter={()=>setActiveService(i)} onFocus={()=>setActiveService(i)} onToggle={event=>{if(event.currentTarget.open)setActiveService(i);}}><summary><span>0{i+1}</span><h3>{zh?cn:en}</h3><span className="reference-service-en">{en}</span><Plus size={20}/></summary><div className="reference-service-description"><p>{zh?desc:descEn}</p><Link href={`/portfolio/${group}`}>{zh?"查看相关作品":"VIEW WORK"} ↗</Link></div></details>)}</div>
    </section>
    <CreativeChapters />
    <section id="about" className="reference-about">
      <div className="reference-about-copy"><p className="reference-eyebrow">ABOUT</p><h2>{zh?"一个始终相信影像力量的创作者。":"A creator who believes in the power of images."}</h2><p>{zh?<>用视觉讲述真实的故事，<br/>连接品牌、人与更大的世界。<br/>创意，不止于画面，而是关于未来的更多可能。</>:<>Visual stories that connect brands,<br/>people and the world.<br/>Ideas that reach beyond the frame.</>}</p><p className="reference-micro">SAME CURIOSITY.<br/>A BRIGHTER TOMORROW.</p></div>
      <div className="reference-wordmark"><PenNote text="always curious" className="brush-about-note"/><strong>LIUKER</strong><PenMark kind="underline" className="pen-brand-underline"/><p>FILMMAKER<br/>CREATIVE DIRECTOR<br/>VISUAL STORYTELLER</p></div>
      <figure><div className={`cinema-portrait ${portraitOpen?"is-revealed":""}`}><img src={mediaUrl('/media/contact/footer-search-character.webp','poster')} alt={zh?"LIUKER 角色肖像":"LIUKER portrait"} loading="lazy"/><img className="cinema-portrait-layer" src={selected[0].poster} alt="" aria-hidden="true" loading="lazy"/><span className="cinema-portrait-label" aria-hidden="true">BEHIND THE FRAME</span></div><button className="cinema-portrait-toggle" aria-pressed={portraitOpen} onClick={()=>setPortraitOpen(!portraitOpen)}>{zh?(portraitOpen?"返回肖像 −":"揭开作品图层 +"):(portraitOpen?"PORTRAIT −":"REVEAL WORK +")}</button><figcaption>Good Ideas.<br/>Travel Further.</figcaption></figure>
    </section>
    <div className="reference-background">
      <details id="experience"><summary>EXPERIENCE <Plus size={17}/></summary><div className="reference-experience">{siteContent.experience.map(item=><article key={item.year}><span>{item.year}</span><h3>{t(item.title,language)}</h3></article>)}</div></details>
      <details id="toolkit"><summary>TOOLS IN MOTION <Plus size={17}/></summary><p>After Effects · DaVinci Resolve · Cinema 4D · Blender · Premiere Pro · Photoshop · Illustrator · Figma</p></details>
    </div>
    <footer id="contact" className="reference-contact">
      <div className="pen-footer-heading"><p className="reference-footer-kicker">LET’S MAKE</p><div className="pen-footer-note"><BrushFooter /></div></div>
      <div className="reference-footer-title"><h2 aria-label="THE NEXT FRAME.">{["THE","NEXT","FRAME."].map((word,i)=><span className="cinema-end-word" aria-hidden="true" key={word} style={{"--word-index":i} as React.CSSProperties}><FooterBrushWord word={word}/></span>)}</h2><Link href="/contact">{zh?"联系合作":"LET’S TALK"}<ArrowRight size={27}/></Link></div>
      <p className="reference-footer-description">{zh?"期待与你一起，创造下一个值得被看见的画面。":"Let’s create the next frame worth seeing."}</p>
      <div className="reference-footer-social" id="contact-channels"><span>FOR A BRIGHTER TOMORROW.</span><p>WECHAT　 EMAIL　 BEHANCE　 INSTAGRAM</p></div>
      <div className="reference-footer-bottom"><Link href="/">LIUKER</Link><span>© {new Date().getFullYear()} LIUKER. ALL RIGHTS RESERVED.</span><a href="#top">{zh?"创意，不止于画面。":"BEYOND THE FRAME."} ↑</a></div>
    </footer>
  </main>;
}
