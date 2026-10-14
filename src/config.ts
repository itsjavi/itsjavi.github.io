export const SITE_TITLE = "Javi Aguilar · Apps and libraries";
export const SITE_DESCRIPTION =
  "Websites, web apps, Mac apps and open source libraries by Javi Aguilar, a senior full-stack software and product engineer in Berlin.";

export const PROFILE = {
  name: "Javi Aguilar",
  role: "Senior Software & Product Engineer",
  location: "Berlin",
  headline:
    "Senior full-stack software and product engineer in Berlin, focused on UX, web standards, performance, developer experience and AI-assisted workflows.",
  intro:
    "Passionate about modern web technologies and AI. I build websites, web apps, and the native apps and open source libraries you'll find here.",
};

export const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/itsjavi" },
  { label: "Bluesky", href: "https://bsky.app/profile/itsjavi.com" },
  { label: "Mastodon", href: "https://mastodon.social/@itsjavi" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/itsjavi" },
] as const;

export const NAV_ITEMS = [
  { id: "discover", label: "Discover", href: "/" },
  { id: "apps", label: "Apps", href: "/projects/" },
  { id: "libraries", label: "Libraries", href: "/projects/libraries/" },
  { id: "writing", label: "Writing", href: "/blog/" },
  { id: "about", label: "About", href: "/about/" },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"] | "experiments" | "editor";
