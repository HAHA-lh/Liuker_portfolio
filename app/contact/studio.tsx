"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Copy, Download } from "lucide-react";
import { useLanguage } from "../language";
import { FooterBrushWord } from "../components/FooterBrushWord";

const services = [
  ["品牌影片", "Brand film"], ["商业广告", "Commercial"], ["AIGC / CGI", "AIGC / CGI"],
  ["直播礼物", "Live gifts"], ["角色 / 平面设计", "Character / graphic"], ["其他创意", "Something else"],
];

export default function ContactStudio() {
  const { language, setLanguage } = useLanguage();
  const zh = language === "zh";
  const [selected, setSelected] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [idea, setIdea] = useState("");
  const [budget, setBudget] = useState("");
  const [timing, setTiming] = useState("");
  const [status, setStatus] = useState("");
  const [wechatStatus, setWechatStatus] = useState("");
  const output = useRef<HTMLTextAreaElement>(null);
  const words = (a: string, b: string) => zh ? a : b;
  const directions = selected.map(i => services[i][zh ? 0 : 1]).join(" / ");
  const brief = `${words("LIUKER · 合作需求", "LIUKER · PROJECT BRIEF")}\n\n${words("称呼 / 品牌", "Name / brand")}: ${name || "—"}\n${words("联系方式", "Contact")}: ${contact || "—"}\n${words("合作方向", "Services")}: ${directions || "—"}\n${words("预算", "Budget")}: ${budget || "—"}\n${words("时间计划", "Timeline")}: ${timing || "—"}\n\n${words("项目想法", "The idea")}\n${idea || "—"}`;
  const ready = [selected.length > 0, !!name.trim(), !!contact.trim(), !!idea.trim()].filter(Boolean).length;
  async function copy() {
    try { await navigator.clipboard.writeText(brief); setStatus(words("已复制需求，尚未发送。", "Brief copied. Not sent.")); }
    catch { output.current?.focus(); output.current?.select(); setStatus(words("请在下方手动复制需求。", "Please copy the selected brief below.")); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([brief], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "LIUKER-project-brief.txt"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(words("需求文件已生成，尚未发送。", "Brief downloaded. Not sent."));
  }
  return <main className="contact-studio">
    <header className="cs-nav"><Link href="/" className="cs-logo">LIUKER</Link><span>INDEPENDENT CREATIVE / OPEN CONVERSATIONS</span><div><button onClick={() => setLanguage(zh ? "en" : "zh")} aria-label={zh ? "Switch to English" : "切换中文"}>{zh ? "EN" : "中文"}</button><Link href="/">{words("返回首页", "Back home")} ↗</Link></div></header>
    <section className="cs-intro">
      <div className="cs-opening"><p className="cs-eyebrow">CONTACT / START A CONVERSATION</p><h1>{words("好想法，", "Good ideas.")}<br />{words("值得一起", "Better")}<br /><em>{words("发生。", "together.")}</em></h1><p className="cs-lead">{words("不必等到想法完美。一个灵感、一份需求，或一句“我们试试”，就可以开始。", "An idea, a brief, or a simple “what if?” You don’t need all the answers to start a conversation.")}</p><a className="cs-start" href="#project-brief">{words("聊聊你的项目", "Tell me about your project")}<ArrowDown size={20}/></a></div>
      <a className="cs-poster" href="#project-brief" aria-label={words("开始整理项目需求", "Start your project brief")}>
        <div className="cs-poster-meta"><span>CREATIVE CONNECTION</span><span>VOL. 01 ↗</span></div>
        <div className="cs-orbit" aria-hidden="true"><span>+</span></div>
        <div className="cs-poster-type" aria-label="THE NEXT FRAME"><FooterBrushWord word="THE"/><FooterBrushWord word="NEXT"/><FooterBrushWord word="FRAME."/></div>
        <div className="cs-poster-bottom"><span>YOUR IDEA.<br/>OUR NEXT FRAME.</span><span className="cs-stamp">LET’S<br/>MAKE IT</span><ArrowUpRight size={38}/></div>
      </a>
    </section>
    <section className="cs-channels" aria-label={words("联系方式", "Contact details")}>
      <a href="mailto:541067143@qq.com"><span>01 / EMAIL</span><strong>541067143@qq.com</strong><ArrowUpRight/></a>
      <button type="button" onClick={async () => {try {await navigator.clipboard.writeText("a541067143");setWechatStatus(words("微信号已复制", "WeChat ID copied"));} catch {setWechatStatus(words("请手动复制：a541067143", "Copy manually: a541067143"));}}}><span>02 / WECHAT</span><strong>a541067143</strong><Copy size={20}/></button>
      <a href="tel:+8615072059913"><span>03 / PHONE</span><strong>+86 150 7205 9913</strong><ArrowUpRight/></a>
      <p role="status">{wechatStatus}</p>
    </section>
    <section className="cs-project" id="project-brief">
      <div className="cs-section-heading"><span className="cs-eyebrow">01 / PROJECT BUILDER</span><h2>{words("下一帧，由你开场。", "Your idea starts here.")}</h2><p>{words("选几个关键词，把灵感变成一份清晰的合作需求。", "Choose a direction. Turn your first thought into a clear brief.")}</p></div>
      <div className="cs-builder"><form onSubmit={e => e.preventDefault()} className="cs-form">
        <fieldset><legend><span>01</span>{words("想一起做什么？", "What shall we make?")}</legend><div className="cs-chips">{services.map((service, i) => <button key={service[1]} type="button" aria-pressed={selected.includes(i)} onClick={() => {setSelected(s => s.includes(i) ? s.filter(v => v !== i) : [...s, i]); setStatus("");}}>{service[zh ? 0 : 1]}{selected.includes(i) ? <Check size={16}/> : <span>↗</span>}</button>)}</div></fieldset>
        <fieldset><legend><span>02</span>{words("先认识一下", "A little introduction")}</legend><div className="cs-fields"><label>{words("你的称呼 / 品牌", "Your name / brand")}<input value={name} onChange={e => setName(e.target.value)} autoComplete="organization" maxLength={120} placeholder={words("怎么称呼你？", "How should I call you?")}/></label><label>{words("邮箱 / 微信", "Email / WeChat")}<input value={contact} onChange={e => setContact(e.target.value)} maxLength={200} placeholder={words("方便联系你的方式", "Where can we reach you?")}/></label></div></fieldset>
        <fieldset><legend><span>03</span>{words("说说你的想法", "Tell me the idea")}</legend><label className="cs-idea-label">{words("项目目标、风格或交付需求", "Goal, style or deliverables")}<textarea value={idea} onChange={e => setIdea(e.target.value)} maxLength={3000} rows={4} placeholder={words("你想表达什么？让谁看到？可以先说个大概。", "What do you want to say, and who is it for? A rough idea is enough.")}/></label><div className="cs-fields"><label>{words("预算范围 · 选填", "Budget · optional")}<input value={budget} onChange={e => setBudget(e.target.value)} maxLength={100} placeholder={words("金额 / 待沟通", "Amount / to discuss")}/></label><label>{words("时间计划 · 选填", "Timeline · optional")}<input value={timing} onChange={e => setTiming(e.target.value)} maxLength={100} placeholder={words("理想上线时间", "Ideal launch date")}/></label></div></fieldset>
      </form><aside className="cs-ticket"><div className="cs-ticket-top"><span>YOUR NEXT FRAME</span><ArrowUpRight/></div><p className="cs-ticket-number">0{ready}<small> / 04</small></p><div className="cs-progress" aria-label={words(`已填写 ${ready} 项，共 4 项`, `${ready} of 4 sections completed`)}><i style={{width: `${ready * 25}%`}}/></div><h3>{directions || words("想法待入场", "An idea is waiting")}</h3><p className="cs-ticket-hint">{words("填写左侧内容，这张需求单会实时更新。", "Your brief takes shape as you fill in the details.")}</p><textarea ref={output} className="cs-brief-output" aria-label={words("项目需求预览", "Project brief preview")} value={brief} readOnly rows={8}/>
        <a className="cs-copy" href={`mailto:541067143@qq.com?subject=${encodeURIComponent("LIUKER · 项目合作 / " + (name || "New project"))}&body=${encodeURIComponent(brief)}`}>{words("用邮箱发起合作", "Start by email")}<ArrowUpRight size={18}/></a>
        <button className="cs-download" onClick={copy}><Copy size={15}/>{words("复制合作需求", "Copy project brief")}</button><button className="cs-download" onClick={download}><Download size={15}/>{words("下载需求单 .TXT", "Download brief .TXT")}</button><p role="status" className="cs-status">{status}</p><p className="cs-disclosure">{words("邮箱按钮会打开你的邮件应用，需自行确认发送。本页不会自动发送或保存个人信息；也可复制需求，通过微信联系。", "The email button opens your mail app for you to review and send. This page does not send or store your details. You can also copy the brief to WeChat.")}</p></aside></div>
    </section>
    <section className="cs-process"><p className="cs-eyebrow">02 / WHAT HAPPENS NEXT</p><div>{[["聊想法", "Connect", "明确目标、受众与交付内容。", "Define the goal, audience and deliverables."],["定方向", "Shape", "讨论视觉方向、范围与时间计划。", "Discuss visual direction, scope and timing."],["让它发生", "Create", "从概念到画面，一起推进创作。", "Bring the concept to life, together."]].map((s,i)=><article key={s[1]}><span>0{i+1} /</span><h3>{s[zh?0:1]}<ArrowUpRight/></h3><p>{s[zh?2:3]}</p></article>)}</div></section>
    <div className="cs-social"><span>ELSEWHERE /</span>{["B站 BILIBILI", "抖音 DOUYIN", "小红书 RED"].map(s=><span key={s}>{s}<small>{words("链接待补充", "Link coming soon")}</small></span>)}</div>
    <footer className="cs-footer"><Link href="/work">{words("再看一些作品", "Explore the work")} ↗</Link><span>LIUKER © {new Date().getFullYear()} / FOR A BRIGHTER TOMORROW.</span><a href="#">↑ {words("回到顶部", "Back to top")}</a></footer>
  </main>;
}
