import type { Metadata } from "next";
import ContactStudio from "./studio";
import "./contact.css";

export const metadata: Metadata = {
  title: "联系合作 · LIUKER",
  description: "从一个想法开始。与 LIUKER 一起创作品牌影像、CGI、直播礼物与角色视觉。",
};

export default function ContactPage() { return <ContactStudio />; }
