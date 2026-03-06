import { DateTime } from "luxon";

export default function(eleventyConfig) {
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("MMMM d, yyyy");
  });

  eleventyConfig.addCollection("blog", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("blog")
      .filter((post) => {
        const status = (post.data.status || "published").toLowerCase();
        return status === "published";
      })
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  return {
    pathPrefix: "/blog",
    dir: {
      input: "content",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data",
      output: "../www/blog"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
}
