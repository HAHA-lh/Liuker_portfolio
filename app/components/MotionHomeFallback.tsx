"use client";

import Link from "next/link";
import { projects, siteContent, t } from "../content";
import { useLanguage } from "../language";
import { SHOWREEL_VIDEO_SRC } from "../hero-media";
import "./MotionHomeFallback.css";

const selectedWork = [
  { slug: "afterglow", image: "ballantines.webp" },
  { slug: "orbital-form", image: "honor.webp" },
  { slug: "quiet-tides", image: "broadcast.webp" },
  { slug: "kinetic-type", image: "how.webp" },
  { slug: "silent-ad", image: "character.webp" },
  { slug: "project-2026-08-31-02", image: "shanhaijing.webp" },
].flatMap(({ slug, image }) => {
  const project = projects.find((item) => item.slug === slug);
  return project ? [{ project, image }] : [];
});

const services = [
  {
    title: { zh: "品牌影像", en: "Brand films" },
    note: {
      zh: "从创意与分镜，到剪辑与调色，让品牌的想法成为有节奏、有记忆点的影像。",
      en: "From concept and storyboards to editing and colour, shaping brand ideas into memorable moving images.",
    },
  },
  {
    title: { zh: "AI 与 CGI", en: "AI & CGI" },
    note: {
      zh: "探索三维、材质与合成，让想象中的角色、产品和世界拥有可见的形态。",
      en: "Exploring 3D, materials and compositing to give imagined characters, products and worlds a visual form.",
    },
  },
  {
    title: { zh: "动态设计", en: "Motion design" },
    note: {
      zh: "以设计组织节奏，让动态图形、直播礼物与社交内容在运动中传递想法。",
      en: "Finding rhythm through design, bringing ideas to life in motion graphics, live gifts and social content.",
    },
  },
];

export function MotionHomeFallback({ onOpenShowreel }: { onOpenShowreel: () => void }) {
  const { language, setLanguage } = useLanguage();
  const zh = language === "zh";

  return (
    <div className="motion-home-fallback" id="motion-static-top">
      <a className="motion-static-skip" href="#project-field">
        {zh ? "跳转至精选作品" : "Skip to selected work"}
      </a>

      <header className="motion-static-header">
        <Link href="/" className="motion-static-brand" aria-label={zh ? "LIUKER 首页" : "LIUKER home"}>
          LIUKER<span aria-hidden="true">.</span>
        </Link>
        <nav className="motion-static-nav" aria-label={zh ? "主导航" : "Main navigation"}>
          <Link href="/work">{zh ? "作品" : "Work"}</Link>
          <a href="#services">{zh ? "服务" : "Services"}</a>
          <a href="#about">{zh ? "关于" : "About"}</a>
        </nav>
        <div className="motion-static-header-actions">
          <button
            className="motion-static-language"
            type="button"
            onClick={() => setLanguage(zh ? "en" : "zh")}
            aria-label={zh ? "Switch to English" : "切换为中文"}
          >
            {zh ? "EN" : "中文"}
          </button>
          <Link href="/contact" className="motion-static-header-contact">
            {zh ? "联系合作" : "Let’s talk"}<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className="motion-static-hero" aria-labelledby="motion-static-hero-title">
        <div className="motion-static-hero-copy">
          <p className="motion-static-eyebrow"><span aria-hidden="true" />{zh ? "独立影像创作者" : "Independent visual creator"}</p>
          <h1 className="motion-static-hero-title" id="motion-static-hero-title">
            <span>BEYOND</span><span>THE</span><span>FRAME<span className="motion-static-period">.</span></span>
          </h1>
          <p className="motion-static-tagline">{zh ? "创意，不止于画面。" : "Ideas that reach beyond the frame."}</p>
          <p className="motion-static-intro">{t(siteContent.heroIntro, language)}</p>
          <a href={SHOWREEL_VIDEO_SRC} className="motion-static-button" aria-haspopup="dialog" aria-label={zh ? "播放 Showreel" : "Play Showreel"} onClick={(event) => { event.preventDefault(); onOpenShowreel(); }}>
            {zh ? "播放作品集" : "Watch showreel"}<span aria-hidden="true">↗</span>
          </a>
        </div>

        <figure className="motion-static-computer">
          <figcaption className="motion-static-computer-label"><span>01 / LIUKER IN MOTION</span><span aria-hidden="true">●</span></figcaption>
          <div className="motion-static-monitor">
            <div className="motion-static-monitor-bezel">
              <img
                className="motion-static-monitor-image"
                src="/motion/assets/hero.webp"
                alt={zh ? "LIUKER 原创角色，蓝色毛衣与红色背景" : "LIUKER character in a blue sweater against a red background"}
                width={1920}
                height={1080}
                fetchPriority="high"
              />
              <span className="motion-static-monitor-mark" aria-hidden="true">LIUKER</span>
            </div>
          </div>
          <div className="motion-static-monitor-neck" aria-hidden="true" />
          <div className="motion-static-monitor-foot" aria-hidden="true" />
          <p className="motion-static-computer-caption">{zh ? "让想法，长出画面。" : "Give the idea a visual form."}</p>
        </figure>
        <div className="motion-static-hero-bottom"><span>{t(siteContent.role, language)}</span><a href="#project-field">{zh ? "向下探索" : "Scroll to explore"}<span aria-hidden="true">↓</span></a></div>
      </section>

      <section className="motion-static-work" id="project-field" aria-labelledby="motion-static-work-title">
        <div className="motion-static-section-heading">
          <div><p className="motion-static-eyebrow">01 / {zh ? "精选作品" : "Selected work"}</p><h2 id="motion-static-work-title">SELECTED<br />FRAMES<span className="motion-static-period">.</span></h2></div>
          <p className="motion-static-section-note">{zh ? "影像、三维与动态设计。每个项目，都是想法的一次展开。" : "Film, 3D and motion design. A different expression of an idea, in every project."}</p>
        </div>
        <div className="motion-static-project-grid">
          {selectedWork.map(({ project, image }, index) => (
            <article className="motion-static-project" key={project.slug}>
              <Link href={`/work/${project.slug}`} prefetch={false} className="motion-static-project-link">
                <div className="motion-static-project-image-wrap">
                  <img src={`/motion/assets/${image}`} alt={t(project.title, language)} width={960} height={540} loading="lazy" decoding="async" className="motion-static-project-image" />
                  <span className="motion-static-project-open" aria-hidden="true">↗</span>
                </div>
                <div className="motion-static-project-meta"><span className="motion-static-project-number">{String(index + 1).padStart(2, "0")}</span><h3>{t(project.title, language)}</h3><span>{project.year}</span></div>
                <p className="motion-static-project-category">{t(project.category, language)}</p>
              </Link>
            </article>
          ))}
        </div>
        <Link href="/work" className="motion-static-text-link">{zh ? "查看全部作品" : "View all work"}<span aria-hidden="true">↗</span></Link>
      </section>

      <section className="motion-static-services" id="services" aria-labelledby="motion-static-services-title">
        <div className="motion-static-section-heading">
          <div><p className="motion-static-eyebrow">02 / {zh ? "创作服务" : "Services"}</p><h2 id="motion-static-services-title">{zh ? <>从一个想法，<br />到下一帧。</> : <>From an idea.<br />To the next frame.</>}</h2></div>
          <Link href="/contact" className="motion-static-text-link">{zh ? "聊聊你的项目" : "Tell me about your project"}<span aria-hidden="true">↗</span></Link>
        </div>
        <div className="motion-static-service-list">
          {services.map((service, index) => (
            <article className="motion-static-service" key={service.title.en}>
              <span className="motion-static-service-number">0{index + 1}</span><h3>{t(service.title, language)}</h3><p>{t(service.note, language)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="motion-static-about" id="about" aria-labelledby="motion-static-about-title">
        <figure className="motion-static-portrait"><img src="/motion/assets/avatar.webp" alt={zh ? "LIUKER 角色肖像" : "LIUKER character portrait"} width={720} height={720} loading="lazy" decoding="async" /><figcaption>LIUKER / {t(siteContent.role, language)}</figcaption></figure>
        <div className="motion-static-about-copy"><p className="motion-static-eyebrow">03 / {zh ? "关于我" : "About"}</p><h2 id="motion-static-about-title">{zh ? "一个始终相信影像力量的创作者。" : "A creator who believes in the power of images."}</h2><p>{zh ? "用视觉讲述真实的故事，连接品牌、人与更大的世界。创意，不止于画面，而是关于未来的更多可能。" : "Visual stories that connect brands, people and the world. Ideas that reach beyond the frame."}</p><p className="motion-static-about-signature">ALWAYS<br />CURIOUS<span className="motion-static-period">.</span></p><a href="#experience" className="motion-static-text-link">{zh ? "创作经历" : "Experience"}<span aria-hidden="true">↓</span></a></div>
      </section>

      <section className="motion-static-experience" id="experience" aria-labelledby="motion-static-experience-title">
        <div className="motion-static-section-heading"><div><p className="motion-static-eyebrow">04 / {zh ? "创作经历" : "Experience"}</p><h2 id="motion-static-experience-title">{zh ? "让好奇，持续发生。" : "Stay curious. Keep creating."}</h2></div></div>
        <div className="motion-static-experience-list">{siteContent.experience.map((item) => <article className="motion-static-experience-item" key={item.year}><span>{item.year}</span><div><h3>{t(item.title, language)}</h3><p>{t(item.note, language)}</p></div></article>)}</div>
      </section>

      <footer className="motion-static-contact" id="contact" aria-labelledby="motion-static-contact-title">
        <p className="motion-static-eyebrow">05 / {zh ? "联系合作" : "Contact"}</p>
        <div className="motion-static-contact-heading"><h2 id="motion-static-contact-title">LET’S MAKE<br />THE NEXT<br />FRAME<span className="motion-static-period">.</span></h2><div><p>{zh ? "期待与你一起，创造下一个值得被看见的画面。" : "Let’s create the next frame worth seeing."}</p><Link href="/contact" className="motion-static-button">{zh ? "开始合作" : "Start a conversation"}<span aria-hidden="true">↗</span></Link></div></div>
        <dl className="motion-static-contact-details"><div><dt>{zh ? "合作邮箱" : "Email"}</dt><dd><a href="mailto:541067143@qq.com">541067143@qq.com</a></dd></div><div><dt>{zh ? "微信" : "WeChat"}</dt><dd>a541067143</dd></div><div><dt>{zh ? "电话" : "Phone"}</dt><dd><a href="tel:+8615072059913">15072059913</a></dd></div></dl>
        <div className="motion-static-footer-bottom"><Link href="/" className="motion-static-brand">LIUKER<span aria-hidden="true">.</span></Link><span>© {new Date().getFullYear()} LIUKER</span><a href="#motion-static-top">{zh ? "返回顶部" : "Back to top"}<span aria-hidden="true">↑</span></a></div>
      </footer>
    </div>
  );
}
