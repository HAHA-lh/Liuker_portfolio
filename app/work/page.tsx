import type { Metadata } from "next";
import { WorkIndex } from "./work-index";

export const metadata: Metadata = {
  title: "Work — LIUKER",
  description: "Film, AI/CGI and motion design work by LIUKER.",
};

export default function WorkIndexPage() {
  return <WorkIndex />;
}
