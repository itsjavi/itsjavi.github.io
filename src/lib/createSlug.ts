// Adapted from https://equk.co.uk/2023/02/02/generating-slug-from-title-in-astro/

import { GENERATE_SLUG_FROM_TITLE } from "../config";

export default function (title: string, staticSlug: string) {
  return !GENERATE_SLUG_FROM_TITLE
    ? staticSlug
    : title
        // remove leading & trailing whitespace
        .trim()
        // output lowercase
        .toLowerCase()
        // replace hypens
        .replace(/\s+-\s+/g, "-")
        // replace spaces
        .replace(/\s+/g, "-")
        // remove special characters
        .replace(/[^\w-]/g, "")
        // remove leading & trailing separtors
        .replace(/^-+|-+$/g, "");
}

export function createSlugV2({
  data,
  slug: filenameSlug,
}: {
  data: { title: string; customSlug?: string };
  slug: string;
}) {
  if (data.customSlug) {
    return data.customSlug;
  }

  return !GENERATE_SLUG_FROM_TITLE
    ? filenameSlug
    : data.title
        // remove leading & trailing whitespace
        .trim()
        // output lowercase
        .toLowerCase()
        // replace hypens
        .replace(/\s+-\s+/g, "-")
        // replace spaces
        .replace(/\s+/g, "-")
        // remove special characters
        .replace(/[^\w-]/g, "")
        // remove leading & trailing separtors
        .replace(/^-+|-+$/g, "");
}
