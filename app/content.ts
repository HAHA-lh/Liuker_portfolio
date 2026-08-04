import { projectRows } from "./project-rows.generated";

export type Language = "zh" | "en";

export type LocalizedText = {
  zh: string;
  en: string;
};

export type Project = {
  slug: string;
  title: LocalizedText;
  category: LocalizedText;
  year: string;
  role: LocalizedText;
  duration: string;
  summary: LocalizedText;
  challenge: LocalizedText;
  process: LocalizedText;
  result: LocalizedText;
  tools: string[];
  previewVideo: string;
  heroVideo: string;
  poster: string;
  visual: string;
  featured: boolean;
};

const media = {
  flower:
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  city:
    "https://videos.pexels.com/video-files/3130284/3130284-hd_3840_2160_30fps.mp4",
  water:
    "https://videos.pexels.com/video-files/3129595/3129595-hd_1920_1080_25fps.mp4",
  portrait:
    "https://videos.pexels.com/video-files/853800/853800-hd_1920_1080_30fps.mp4",
  motion:
    "https://videos.pexels.com/video-files/2869107/2869107-hd_1920_1080_25fps.mp4",
  night:
    "https://videos.pexels.com/video-files/3629511/3629511-hd_1920_1080_25fps.mp4",
};

export const siteContent = {
  name: "LIUKER",
  role: { zh: "视频创作者 / 动态设计师", en: "VIDEO CREATOR / MOTION DESIGNER" },
  heroIntro: {
    zh: "用影像、节奏与设计，把想法变成让人记住的画面。",
    en: "Turning ideas into memorable moving images through film, rhythm and design.",
  },
  about: {
    zh: "这是一份为招聘方设计的视频创作者作品集框架。它聚焦我在创意、导演、拍摄、剪辑与动态设计中的职责，也保留足够空间，让每个项目讲清楚问题、过程与结果。当前内容均为演示占位，下一步将逐项替换为真实经历与作品。",
    en: "This is a recruiter-focused portfolio framework for a video creator. It highlights my role across concept, direction, production, editing and motion design, while giving each project room to explain the challenge, process and result. All current content is clearly marked as demo material ready to be replaced.",
  },
  contact: {
    heading: { zh: "一起创造下一帧", en: "LET'S MAKE THE NEXT FRAME" },
    note: {
      zh: "联系方式与社交链接尚未配置。替换为你的真实信息后，这里会成为招聘方最直接的联系入口。",
      en: "Contact and social links are not configured yet. Once replaced, this becomes the clearest route for recruiters to reach you.",
    },
  },
  nav: {
    work: { zh: "作品", en: "Work" },
    about: { zh: "关于", en: "About" },
    experience: { zh: "经历与技能", en: "Experience" },
    contact: { zh: "联系", en: "Contact" },
  },
  experience: [
    {
      year: "20XX — NOW",
      title: { zh: "视频创作者 / 自由职业", en: "Video Creator / Freelance" },
      note: {
        zh: "占位经历：品牌短片、社交内容与动态视觉。",
        en: "Placeholder experience: brand films, social content and motion visuals.",
      },
    },
    {
      year: "20XX — 20XX",
      title: { zh: "后期与动态设计", en: "Post-production & Motion" },
      note: {
        zh: "占位经历：剪辑、调色、声音与动态图形。",
        en: "Placeholder experience: editing, color, sound and motion graphics.",
      },
    },
    {
      year: "20XX — 20XX",
      title: { zh: "视觉设计实习", en: "Visual Design Intern" },
      note: {
        zh: "占位经历：视觉研究、分镜与设计系统。",
        en: "Placeholder experience: visual research, storyboards and design systems.",
      },
    },
  ],
  skills: [
    "Premiere Pro",
    "After Effects",
    "DaVinci Resolve",
    "Cinema 4D",
    "Blender",
    "Photoshop",
    "Illustrator",
    "Figma",
  ],
  capabilities: [
    { zh: "创意与分镜", en: "Concept & Storyboard" },
    { zh: "导演与拍摄", en: "Direction & Production" },
    { zh: "剪辑与调色", en: "Edit & Color" },
    { zh: "动态图形与三维", en: "Motion & 3D" },
  ],
} as const;

const baseProjects: Project[] = [
  {
    slug: "afterglow",
    title: { zh: "余晖", en: "Afterglow" },
    category: { zh: "品牌短片", en: "Brand Film" },
    year: "2026",
    role: { zh: "导演 / 剪辑", en: "Direction / Edit" },
    duration: "01:24",
    summary: {
      zh: "以自然光与缓慢节奏构建的品牌情绪短片演示，强调产品与环境之间的微妙关系。",
      en: "A demo brand film built around natural light and measured pacing, exploring the subtle relationship between product and place.",
    },
    challenge: {
      zh: "在没有对白的情况下，用光线、质感和节奏建立完整的品牌情绪。",
      en: "Create a complete brand mood through light, texture and rhythm without relying on dialogue.",
    },
    process: {
      zh: "从色彩脚本与镜头清单出发，先锁定自然光窗口，再围绕三个节奏段落完成剪辑。",
      en: "Starting with a color script and shot list, the edit was shaped into three rhythmic chapters around a narrow natural-light window.",
    },
    result: {
      zh: "形成一支可延展为横版主片与竖版社交切片的视觉母版。",
      en: "A visual master designed to extend into both a hero film and vertical social cutdowns.",
    },
    tools: ["Premiere Pro", "DaVinci Resolve"],
    previewVideo: media.flower,
    heroVideo: media.flower,
    poster: "",
    visual: "linear-gradient(135deg, #160c22 0%, #6c2868 42%, #ef7b40 100%)",
    featured: true,
  },
  {
    slug: "neon-pulse",
    title: { zh: "霓虹脉冲", en: "Neon Pulse" },
    category: { zh: "广告", en: "Commercial" },
    year: "2026",
    role: { zh: "创意 / 后期", en: "Concept / Post" },
    duration: "00:45",
    summary: {
      zh: "为年轻消费品牌设计的高能量广告演示，以快速剪辑、光效与声音节奏推动记忆点。",
      en: "A high-energy commercial demo for a youth brand, driven by rapid edits, light effects and a tightly designed sound rhythm.",
    },
    challenge: {
      zh: "在极短时长中清楚建立视觉识别，同时保持信息可读性。",
      en: "Build a recognizable visual language in a very short runtime without sacrificing clarity.",
    },
    process: {
      zh: "将镜头、字幕与声音拆成统一节拍，以模块化方式组合不同长度版本。",
      en: "Shots, typography and sound were mapped to one beat system, enabling modular edits at multiple durations.",
    },
    result: {
      zh: "得到一套可适配开屏、信息流与户外屏幕的动态资产系统。",
      en: "A modular motion system adaptable to launch screens, social feeds and large-format displays.",
    },
    tools: ["After Effects", "Premiere Pro"],
    previewVideo: media.city,
    heroVideo: media.city,
    poster: "",
    visual: "linear-gradient(135deg, #08072a 0%, #491f9a 48%, #ff3864 100%)",
    featured: true,
  },
  {
    slug: "quiet-tides",
    title: { zh: "静潮", en: "Quiet Tides" },
    category: { zh: "纪录短片", en: "Documentary" },
    year: "2025",
    role: { zh: "摄影 / 剪辑", en: "Cinematography / Edit" },
    duration: "03:12",
    summary: {
      zh: "围绕人与海岸日常展开的纪录片演示，用观察式镜头保留真实时间感。",
      en: "A documentary demo observing everyday life by the coast, using patient imagery to preserve a sense of real time.",
    },
    challenge: {
      zh: "在有限拍摄条件下建立人物、环境与时间之间的联系。",
      en: "Connect character, environment and passing time within a limited production setup.",
    },
    process: {
      zh: "采用轻量设备与自然声音记录，通过重复动作和环境变化组织叙事。",
      en: "A lightweight setup and natural sound captured recurring gestures and environmental changes that shaped the narrative.",
    },
    result: {
      zh: "形成一支节奏克制、具备清晰人物视角的短纪录片结构。",
      en: "A restrained short-documentary structure with a clear human point of view.",
    },
    tools: ["DaVinci Resolve", "Audition"],
    previewVideo: media.water,
    heroVideo: media.water,
    poster: "",
    visual: "linear-gradient(135deg, #07151f 0%, #1d6175 52%, #cfb988 100%)",
    featured: true,
  },
  {
    slug: "kinetic-type",
    title: { zh: "字动", en: "Kinetic Type" },
    category: { zh: "动态设计", en: "Motion Design" },
    year: "2025",
    role: { zh: "设计 / 动效", en: "Design / Animation" },
    duration: "00:32",
    summary: {
      zh: "以排版为主角的动态设计演示，让文字、音乐与转场共享同一套节奏逻辑。",
      en: "A typography-led motion study where type, music and transitions share one rhythmic system.",
    },
    challenge: {
      zh: "用最少的图形元素持续制造视觉变化，并保持品牌识别。",
      en: "Create continuous visual change with a minimal graphic vocabulary while retaining brand recognition.",
    },
    process: {
      zh: "先建立网格、字级与缓动规范，再组合为可复用的动画组件。",
      en: "A shared grid, type scale and easing system became a reusable library of animation components.",
    },
    result: {
      zh: "完成一套可快速生成片头、标题卡和社交内容的动态图形模板。",
      en: "A motion toolkit for rapidly producing openers, title cards and social assets.",
    },
    tools: ["After Effects", "Illustrator"],
    previewVideo: media.motion,
    heroVideo: media.motion,
    poster: "",
    visual: "linear-gradient(135deg, #1d1025 0%, #b10076 46%, #ffbf36 100%)",
    featured: true,
  },
  {
    slug: "orbital-form",
    title: { zh: "轨道形态", en: "Orbital Form" },
    category: { zh: "三维动画", en: "3D Animation" },
    year: "2025",
    role: { zh: "三维 / 合成", en: "3D / Compositing" },
    duration: "00:28",
    summary: {
      zh: "围绕材质、轨道运动与灯光变化展开的三维视觉实验。",
      en: "A 3D visual study exploring materials, orbital motion and shifting light.",
    },
    challenge: {
      zh: "让抽象形态在短时间内形成明确的起承转合。",
      en: "Give abstract forms a clear beginning, development and resolution within a short runtime.",
    },
    process: {
      zh: "以程序化运动生成基础节奏，再通过灯光与合成控制视觉重心。",
      en: "Procedural motion set the base rhythm, while lighting and compositing guided visual focus.",
    },
    result: {
      zh: "输出一套可作为品牌启动画面和循环背景的三维素材。",
      en: "A set of 3D assets suitable for brand launch moments and looping backgrounds.",
    },
    tools: ["Cinema 4D", "Redshift", "After Effects"],
    previewVideo: media.portrait,
    heroVideo: media.portrait,
    poster: "",
    visual: "linear-gradient(135deg, #07151a 0%, #107d7a 45%, #ff714b 100%)",
    featured: false,
  },
  {
    slug: "nocturne",
    title: { zh: "夜曲", en: "Nocturne" },
    category: { zh: "音乐视觉", en: "Music Visual" },
    year: "2024",
    role: { zh: "导演 / 视觉", en: "Direction / Visuals" },
    duration: "02:08",
    summary: {
      zh: "以夜间城市、人物轮廓和抽象光影共同构成的音乐视觉演示。",
      en: "A music visual demo combining city nights, human silhouettes and abstract light.",
    },
    challenge: {
      zh: "在不直译歌词的前提下，让画面与音乐形成情绪上的呼应。",
      en: "Echo the music emotionally without illustrating the lyrics literally.",
    },
    process: {
      zh: "从音色与结构中提取视觉关键词，以重复意象贯穿不同段落。",
      en: "Visual keywords were extracted from tone and structure, with recurring motifs connecting each section.",
    },
    result: {
      zh: "建立了一套统一但有足够变化的音乐视觉语言。",
      en: "A cohesive music-visual language with enough variation to sustain the full track.",
    },
    tools: ["Premiere Pro", "After Effects", "DaVinci Resolve"],
    previewVideo: media.night,
    heroVideo: media.night,
    poster: "",
    visual: "linear-gradient(135deg, #09091c 0%, #342d88 48%, #ea3f71 100%)",
    featured: false,
  },
];

export const projects: Project[] = projectRows.map((row) => {
  const template = baseProjects.find((project) => project.slug === row.templateSlug) ?? baseProjects[0];

  return {
    ...template,
    slug: row.slug,
    title: {
      zh: row.titleZh || template.title.zh,
      en: row.titleEn || template.title.en,
    },
    category: {
      zh: row.categoryZh || template.category.zh,
      en: row.categoryEn || template.category.en,
    },
    year: row.year || template.year,
    role: {
      zh: row.roleZh || template.role.zh,
      en: row.roleEn || template.role.en,
    },
    duration: row.duration || template.duration,
    previewVideo: row.previewVideo || template.previewVideo,
    heroVideo: row.fullVideo || template.heroVideo,
    poster: row.cover || template.poster,
    visual: row.visual || template.visual,
    featured: row.featured,
  };
});

export function t(value: LocalizedText, language: Language) {
  return value[language];
}

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
